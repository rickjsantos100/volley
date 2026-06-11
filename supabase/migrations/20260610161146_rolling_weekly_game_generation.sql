create extension if not exists pg_cron;

create table public.recurring_game_series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  max_participants integer not null check (max_participants > 0),
  frequency text not null default 'weekly',
  timezone text not null default 'Europe/Lisbon',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_game_series_weekly_only
    check (frequency = 'weekly')
);

create table public.recurring_game_exceptions (
  id uuid primary key default gen_random_uuid(),
  recurring_series_id uuid not null references public.recurring_game_series(id) on delete cascade,
  recurring_starts_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint recurring_game_exceptions_unique_occurrence
    unique (recurring_series_id, recurring_starts_at)
);

alter table public.game_events
add column recurring_series_id uuid references public.recurring_game_series(id) on delete set null,
add column recurring_starts_at timestamptz;

alter table public.game_events
add constraint game_events_recurring_fields_match
check (
  (recurring_series_id is null and recurring_starts_at is null)
  or (recurring_series_id is not null and recurring_starts_at is not null)
);

create unique index game_events_unique_recurring_occurrence_idx
on public.game_events (recurring_series_id, recurring_starts_at)
where recurring_series_id is not null;

create index recurring_game_series_active_idx
on public.recurring_game_series (active, starts_at);

create index recurring_game_exceptions_series_starts_idx
on public.recurring_game_exceptions (recurring_series_id, recurring_starts_at);

create index game_events_recurring_series_starts_idx
on public.game_events (recurring_series_id, recurring_starts_at);

alter table public.recurring_game_series enable row level security;
alter table public.recurring_game_exceptions enable row level security;

grant select on public.recurring_game_series to authenticated;
grant insert (
  title,
  starts_at,
  duration_minutes,
  max_participants,
  frequency,
  timezone,
  active,
  created_by
) on public.recurring_game_series to authenticated;
grant update (active)
on public.recurring_game_series to authenticated;

grant select on public.recurring_game_exceptions to authenticated;
grant insert (
  recurring_series_id,
  recurring_starts_at,
  created_by
) on public.recurring_game_exceptions to authenticated;

grant insert (
  title,
  starts_at,
  duration_minutes,
  max_participants,
  is_repeatable,
  repeat_frequency,
  repeat_ends_at,
  status,
  created_by,
  recurring_series_id,
  recurring_starts_at
) on public.game_events to authenticated;

create trigger set_recurring_game_series_updated_at
before update on public.recurring_game_series
for each row execute function private.set_updated_at();

create policy "Admins can view recurring game series"
on public.recurring_game_series
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can create recurring game series"
on public.recurring_game_series
for insert
to authenticated
with check (
  (select private.is_admin())
  and created_by = (select auth.uid())
);

create policy "Admins can update recurring game series"
on public.recurring_game_series
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admins can view recurring game exceptions"
on public.recurring_game_exceptions
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can create recurring game exceptions"
on public.recurring_game_exceptions
for insert
to authenticated
with check (
  (select private.is_admin())
  and created_by = (select auth.uid())
);

create or replace function private.ensure_recurring_game_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer := 0;
begin
  with candidate_occurrences as (
    select
      series.id as recurring_series_id,
      series.title,
      series.duration_minutes,
      series.max_participants,
      series.created_by,
      (
        (
          series.starts_at at time zone series.timezone
        ) + (occurrence.week_index * interval '1 week')
      ) at time zone series.timezone as recurring_starts_at
    from public.recurring_game_series as series
    cross join lateral generate_series(
      0,
      greatest(
        0,
        ceil(
          extract(
            epoch from ((now() + interval '30 days') - series.starts_at)
          ) / 604800
        )::integer
      )
    ) as occurrence(week_index)
    where series.active
      and series.frequency = 'weekly'
      and series.starts_at <= now() + interval '30 days'
  ),
  visible_occurrences as (
    select *
    from candidate_occurrences
    where recurring_starts_at >= now()
      and recurring_starts_at <= now() + interval '30 days'
      and not exists (
        select 1
        from public.recurring_game_exceptions as exceptions
        where exceptions.recurring_series_id = candidate_occurrences.recurring_series_id
          and exceptions.recurring_starts_at = candidate_occurrences.recurring_starts_at
      )
  ),
  inserted as (
    insert into public.game_events (
      title,
      starts_at,
      duration_minutes,
      max_participants,
      is_repeatable,
      repeat_frequency,
      status,
      created_by,
      recurring_series_id,
      recurring_starts_at
    )
    select
      title,
      recurring_starts_at,
      duration_minutes,
      max_participants,
      true,
      'weekly',
      'scheduled',
      created_by,
      recurring_series_id,
      recurring_starts_at
    from visible_occurrences
    on conflict (recurring_series_id, recurring_starts_at)
    where recurring_series_id is not null
    do nothing
    returning 1
  )
  select count(*) into inserted_count
  from inserted;

  return inserted_count;
end;
$$;

create or replace function private.ensure_recurring_game_events_after_series_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_recurring_game_events();
  return new;
end;
$$;

create trigger ensure_recurring_game_events_after_series_insert
after insert on public.recurring_game_series
for each statement execute function private.ensure_recurring_game_events_after_series_insert();

select cron.unschedule('ensure-recurring-game-events')
where exists (
  select 1
  from cron.job
  where jobname = 'ensure-recurring-game-events'
);

select cron.schedule(
  'ensure-recurring-game-events',
  '0 3 * * *',
  $$select private.ensure_recurring_game_events();$$
);
