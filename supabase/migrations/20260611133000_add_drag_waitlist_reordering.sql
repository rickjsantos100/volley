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
  from unnest(ordered_entry_ids) with ordinality as ordered_entries(entry_id, next_order)
  where game_waitlist_entries.id = ordered_entries.entry_id
    and game_waitlist_entries.game_event_id = target_game_id
    and game_waitlist_entries.status = 'active';
end;
$$;

grant execute on function public.reorder_game_waitlist(uuid, uuid[])
to authenticated;
