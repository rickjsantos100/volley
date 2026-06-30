create or replace function private.prevent_cancelled_game_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if
    old.status = 'cancelled'
    and (
      new.status not in ('scheduled', 'deleted')
      or (
        to_jsonb(new) - array['status', 'updated_at']
        is distinct from
        to_jsonb(old) - array['status', 'updated_at']
      )
    )
  then
    raise exception 'Cancelled games can only be uncancelled or deleted.';
  end if;

  return new;
end;
$$;

create trigger prevent_cancelled_game_changes
before update on public.game_events
for each row execute function private.prevent_cancelled_game_changes();

drop policy "Authenticated users can leave their own games"
on public.game_participants;

create policy "Authenticated users can leave scheduled games"
on public.game_participants
for delete
to authenticated
using (
  (
    user_id = (select auth.uid())
    or (select private.is_admin())
  )
  and exists (
    select 1
    from public.game_events
    where game_events.id = game_participants.game_event_id
      and game_events.status = 'scheduled'
  )
);

drop policy "Admins can delete waitlist entries"
on public.game_waitlist_entries;

create policy "Admins can delete scheduled game waitlist entries"
on public.game_waitlist_entries
for delete
to authenticated
using (
  (select private.is_admin())
  and exists (
    select 1
    from public.game_events
    where game_events.id = game_waitlist_entries.game_event_id
      and game_events.status = 'scheduled'
  )
);

create or replace function private.prevent_cancelled_game_proof_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.game_events
    where id = new.game_event_id
      and status = 'cancelled'
  ) then
    raise exception 'Payment proofs cannot be changed for cancelled games.';
  end if;

  return new;
end;
$$;

create trigger prevent_cancelled_game_proof_changes
before insert or update on public.game_payment_proofs
for each row execute function private.prevent_cancelled_game_proof_changes();

create or replace function public.reorder_game_waitlist_entry(
  target_entry_id uuid,
  move_direction integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_entry record;
  swap_entry record;
begin
  if not private.is_admin() then
    raise exception 'Only admins can reorder waitlists.';
  end if;

  if move_direction not in (-1, 1) then
    raise exception 'Invalid waitlist move direction.';
  end if;

  select id, game_event_id, waitlist_order, joined_waitlist_at
  into target_entry
  from public.game_waitlist_entries
  where id = target_entry_id
    and status = 'active'
  for update;

  if not found then
    return;
  end if;

  perform 1
  from public.game_events
  where id = target_entry.game_event_id
    and status = 'scheduled'
  for update;

  if not found then
    raise exception 'Cancelled game waitlists cannot be reordered.';
  end if;

  if move_direction = -1 then
    select id, waitlist_order
    into swap_entry
    from public.game_waitlist_entries
    where game_event_id = target_entry.game_event_id
      and status = 'active'
      and (
        waitlist_order < target_entry.waitlist_order
        or (
          waitlist_order = target_entry.waitlist_order
          and joined_waitlist_at < target_entry.joined_waitlist_at
        )
      )
    order by waitlist_order desc, joined_waitlist_at desc, id desc
    for update
    limit 1;
  else
    select id, waitlist_order
    into swap_entry
    from public.game_waitlist_entries
    where game_event_id = target_entry.game_event_id
      and status = 'active'
      and (
        waitlist_order > target_entry.waitlist_order
        or (
          waitlist_order = target_entry.waitlist_order
          and joined_waitlist_at > target_entry.joined_waitlist_at
        )
      )
    order by waitlist_order, joined_waitlist_at, id
    for update
    limit 1;
  end if;

  if not found then
    return;
  end if;

  update public.game_waitlist_entries
  set waitlist_order = swap_entry.waitlist_order
  where id = target_entry.id;

  update public.game_waitlist_entries
  set waitlist_order = target_entry.waitlist_order
  where id = swap_entry.id;
end;
$$;

create or replace function public.reorder_game_waitlist(
  target_game_id uuid,
  ordered_entry_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_entry_count integer;
  provided_entry_count integer;
begin
  if not private.is_admin() then
    raise exception 'Only admins can reorder waitlists.';
  end if;

  perform 1
  from public.game_events
  where id = target_game_id
    and status = 'scheduled'
  for update;

  if not found then
    raise exception 'Cancelled game waitlists cannot be reordered.';
  end if;

  select count(*)
  into active_entry_count
  from public.game_waitlist_entries
  where game_event_id = target_game_id
    and status = 'active';

  select count(distinct entry_id)
  into provided_entry_count
  from unnest(ordered_entry_ids) as entry_id;

  if active_entry_count <> provided_entry_count then
    raise exception 'Waitlist reorder must include every active entry exactly once.';
  end if;

  if exists (
    select 1
    from unnest(ordered_entry_ids) as entry_id
    left join public.game_waitlist_entries
      on game_waitlist_entries.id = entry_id
      and game_waitlist_entries.game_event_id = target_game_id
      and game_waitlist_entries.status = 'active'
    where game_waitlist_entries.id is null
  ) then
    raise exception 'Waitlist reorder contains invalid entries.';
  end if;

  update public.game_waitlist_entries
  set waitlist_order = ordered_entries.next_order
  from unnest(ordered_entry_ids)
    with ordinality as ordered_entries(entry_id, next_order)
  where game_waitlist_entries.id = ordered_entries.entry_id
    and game_waitlist_entries.game_event_id = target_game_id
    and game_waitlist_entries.status = 'active';
end;
$$;
