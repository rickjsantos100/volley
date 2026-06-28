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
  if new.source = 'waitlist_promoted' then
    null;
  elsif new.user_id = (select auth.uid()) then
    new.source = 'self_joined';
  elsif private.is_admin() then
    new.source = 'admin_added';
  else
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
