create type public.game_event_status as enum (
  'scheduled',
  'cancelled',
  'completed'
);

create type public.game_participant_source as enum (
  'self_joined',
  'admin_added',
  'waitlist_promoted'
);

create type public.game_payment_status as enum (
  'unpaid',
  'paid'
);

create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  max_participants integer not null check (max_participants > 0),
  is_repeatable boolean not null default false,
  repeat_frequency text,
  repeat_ends_at timestamptz,
  status public.game_event_status not null default 'scheduled',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repeat_frequency_required_when_repeatable
    check (is_repeatable = false or repeat_frequency is not null),
  constraint repeat_ends_after_start
    check (repeat_ends_at is null or repeat_ends_at > starts_at)
);

create table public.game_participants (
  id uuid primary key default gen_random_uuid(),
  game_event_id uuid not null references public.game_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  added_by uuid references auth.users(id) on delete set null,
  source public.game_participant_source not null default 'self_joined',
  payment_status public.game_payment_status not null default 'unpaid',
  payment_updated_by uuid references auth.users(id) on delete set null,
  payment_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_participants_unique_user unique (game_event_id, user_id)
);

create index game_events_upcoming_idx
on public.game_events (starts_at)
where status = 'scheduled';

create index game_participants_game_event_id_idx
on public.game_participants (game_event_id);

create index game_participants_user_id_idx
on public.game_participants (user_id);

alter table public.game_events enable row level security;
alter table public.game_participants enable row level security;

grant select on public.game_events to authenticated;

revoke all on public.game_participants from anon, authenticated;
grant select (game_event_id) on public.game_participants to authenticated;

create trigger set_game_events_updated_at
before update on public.game_events
for each row execute function private.set_updated_at();

create trigger set_game_participants_updated_at
before update on public.game_participants
for each row execute function private.set_updated_at();

create policy "Authenticated users can view upcoming scheduled games"
on public.game_events
for select
to authenticated
using (
  (
    status = 'scheduled'
    and starts_at >= now()
  )
  or private.is_admin()
);

create policy "Authenticated users can count visible game participants"
on public.game_participants
for select
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.game_events
    where game_events.id = game_participants.game_event_id
      and game_events.status = 'scheduled'
      and game_events.starts_at >= now()
  )
);
