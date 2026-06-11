alter table public.game_waitlist_entries
add column waitlist_order integer;

with ranked_entries as (
  select
    id,
    row_number() over (
      partition by game_event_id
      order by joined_waitlist_at, id
    ) as next_order
  from public.game_waitlist_entries
  where status = 'active'
)
update public.game_waitlist_entries
set waitlist_order = ranked_entries.next_order
from ranked_entries
where game_waitlist_entries.id = ranked_entries.id;

update public.game_waitlist_entries
set waitlist_order = 0
where waitlist_order is null;

alter table public.game_waitlist_entries
alter column waitlist_order set not null;

create index game_waitlist_entries_game_event_order_idx
on public.game_waitlist_entries (
  game_event_id,
  status,
  waitlist_order,
  joined_waitlist_at,
  id
);

grant select (waitlist_order)
on public.game_waitlist_entries to authenticated;

create or replace function private.ensure_game_waitlist_entry_can_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  game_capacity integer;
  participant_count integer;
begin
  if new.user_id <> (select auth.uid()) and not private.is_admin() then
    raise exception 'Only admins can add other users to a waitlist.';
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

  if exists (
    select 1
    from public.game_participants
    where game_event_id = new.game_event_id
      and user_id = new.user_id
  ) then
    raise exception 'You are already in this game.';
  end if;

  select count(*)
  into participant_count
  from public.game_participants
  where game_event_id = new.game_event_id;

  if participant_count < game_capacity then
    raise exception 'This game still has open slots.';
  end if;

  if new.waitlist_order is null or new.waitlist_order = 0 then
    select coalesce(max(waitlist_order), 0) + 1
    into new.waitlist_order
    from public.game_waitlist_entries
    where game_event_id = new.game_event_id
      and status = 'active';
  end if;

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

  select *
  into promoted_entry
  from public.game_waitlist_entries
  where game_event_id = old.game_event_id
    and status = 'active'
  order by waitlist_order, joined_waitlist_at, id
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
  ) values (
    old.game_event_id,
    promoted_entry.user_id,
    old.user_id,
    'waitlist_promoted'
  );

  return old;
end;
$$;

create or replace view public.game_waitlist_details
with (security_invoker = true)
as
select
  game_waitlist_entries.id,
  game_waitlist_entries.game_event_id,
  game_waitlist_entries.user_id,
  game_waitlist_entries.joined_waitlist_at,
  game_waitlist_entries.status,
  row_number() over (
    partition by game_waitlist_entries.game_event_id
    order by game_waitlist_entries.waitlist_order, game_waitlist_entries.joined_waitlist_at, game_waitlist_entries.id
  ) as position,
  profiles.display_name,
  profiles.first_name,
  profiles.last_name,
  profiles.email
from public.game_waitlist_entries
join public.game_events
  on game_events.id = game_waitlist_entries.game_event_id
join public.profiles
  on profiles.id = game_waitlist_entries.user_id
where
  game_waitlist_entries.status = 'active'
  and (
    private.is_admin()
    or (
      game_events.status in ('scheduled', 'cancelled')
      and game_events.starts_at >= now()
    )
  );

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

grant execute on function public.reorder_game_waitlist_entry(uuid, integer)
to authenticated;
