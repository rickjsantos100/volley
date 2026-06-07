grant delete on public.game_participants to authenticated;

create policy "Authenticated users can leave their own games"
on public.game_participants
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_admin()
);

create or replace function private.ensure_game_participant_can_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  game_capacity integer;
  participant_count integer;
begin
  if
    new.source <> 'waitlist_promoted'
    and new.user_id <> (select auth.uid())
    and not private.is_admin()
  then
    raise exception 'Only admins can add other users to a game.';
  end if;

  select max_participants
  into game_capacity
  from public.game_events
  where id = new.game_event_id
    and status = 'scheduled'
    and starts_at >= now()
  for update;

  if game_capacity is null then
    raise exception 'This game is not available to join.';
  end if;

  select count(*)
  into participant_count
  from public.game_participants
  where game_event_id = new.game_event_id;

  if participant_count >= game_capacity then
    raise exception 'This game is full.';
  end if;

  if exists (
    select 1
    from public.game_waitlist_entries
    where game_event_id = new.game_event_id
      and user_id = new.user_id
      and status = 'active'
  ) then
    raise exception 'You are already on the waitlist for this game.';
  end if;

  new.added_by = coalesce(new.added_by, (select auth.uid()));
  return new;
end;
$$;

create or replace function private.promote_waitlist_after_participant_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  promoted_entry record;
begin
  perform 1
  from public.game_events
  where id = old.game_event_id
    and status = 'scheduled'
    and starts_at >= now()
  for update;

  if not found then
    return old;
  end if;

  select id, user_id
  into promoted_entry
  from public.game_waitlist_entries
  where game_event_id = old.game_event_id
    and status = 'active'
  order by joined_waitlist_at, id
  for update skip locked
  limit 1;

  if not found then
    return old;
  end if;

  update public.game_waitlist_entries
  set status = 'promoted'
  where id = promoted_entry.id;

  insert into public.game_participants (
    game_event_id,
    user_id,
    added_by,
    source
  )
  values (
    old.game_event_id,
    promoted_entry.user_id,
    old.user_id,
    'waitlist_promoted'
  )
  on conflict (game_event_id, user_id) do nothing;

  return old;
end;
$$;

create trigger promote_waitlist_after_participant_delete
after delete on public.game_participants
for each row execute function private.promote_waitlist_after_participant_delete();
