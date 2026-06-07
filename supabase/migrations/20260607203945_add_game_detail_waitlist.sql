create type public.game_waitlist_status as enum (
  'active',
  'cancelled',
  'promoted'
);

create table public.game_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  game_event_id uuid not null references public.game_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_waitlist_at timestamptz not null default now(),
  status public.game_waitlist_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index game_waitlist_entries_active_user_idx
on public.game_waitlist_entries (game_event_id, user_id)
where status = 'active';

create index game_waitlist_entries_game_event_status_idx
on public.game_waitlist_entries (game_event_id, status, joined_waitlist_at);

create index game_waitlist_entries_user_id_idx
on public.game_waitlist_entries (user_id);

alter table public.game_waitlist_entries enable row level security;

revoke all on public.game_participants from anon, authenticated;
grant select (id, game_event_id, user_id, joined_at, source)
on public.game_participants to authenticated;
grant insert (game_event_id, user_id)
on public.game_participants to authenticated;

grant select (id, game_event_id, user_id, joined_waitlist_at, status)
on public.game_waitlist_entries to authenticated;
grant insert (game_event_id, user_id)
on public.game_waitlist_entries to authenticated;

create trigger set_game_waitlist_entries_updated_at
before update on public.game_waitlist_entries
for each row execute function private.set_updated_at();

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
  if new.user_id <> (select auth.uid()) and not private.is_admin() then
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

create trigger ensure_game_participant_can_insert
before insert on public.game_participants
for each row execute function private.ensure_game_participant_can_insert();

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

  return new;
end;
$$;

create trigger ensure_game_waitlist_entry_can_insert
before insert on public.game_waitlist_entries
for each row execute function private.ensure_game_waitlist_entry_can_insert();

create policy "Authenticated users can join available games"
on public.game_participants
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  or private.is_admin()
);

create policy "Authenticated users can view visible waitlists"
on public.game_waitlist_entries
for select
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.game_events
    where game_events.id = game_waitlist_entries.game_event_id
      and game_events.status = 'scheduled'
      and game_events.starts_at >= now()
  )
);

create policy "Authenticated users can join full game waitlists"
on public.game_waitlist_entries
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  or private.is_admin()
);

create or replace view public.game_participant_details as
select
  game_participants.id,
  game_participants.game_event_id,
  game_participants.user_id,
  game_participants.joined_at,
  game_participants.source,
  case
    when private.is_admin() or game_participants.user_id = (select auth.uid())
      then game_participants.payment_status
    else null
  end as payment_status,
  profiles.display_name,
  profiles.first_name,
  profiles.last_name,
  profiles.email
from public.game_participants
join public.game_events
  on game_events.id = game_participants.game_event_id
join public.profiles
  on profiles.id = game_participants.user_id
where
  private.is_admin()
  or (
    game_events.status = 'scheduled'
    and game_events.starts_at >= now()
  );

create or replace view public.game_waitlist_details as
select
  game_waitlist_entries.id,
  game_waitlist_entries.game_event_id,
  game_waitlist_entries.user_id,
  game_waitlist_entries.joined_waitlist_at,
  game_waitlist_entries.status,
  row_number() over (
    partition by game_waitlist_entries.game_event_id
    order by game_waitlist_entries.joined_waitlist_at, game_waitlist_entries.id
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
      game_events.status = 'scheduled'
      and game_events.starts_at >= now()
    )
  );

grant select on public.game_participant_details to authenticated;
grant select on public.game_waitlist_details to authenticated;
