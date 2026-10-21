-- Column grants complement, never replace, the existing admin-only UPDATE RLS.
-- Identity, audit and recurrence linkage columns intentionally remain protected.
grant update (title, starts_at, duration_minutes, max_participants)
on public.game_events to authenticated;

grant update (title, starts_at, duration_minutes, max_participants)
on public.recurring_game_series to authenticated;

-- Shared namespace/key: volley / recurring schedule. Acquire before any series
-- statement takes tuple locks, including lifecycle updates and multirow inserts.
create or replace function private.serialize_recurring_schedule()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(1987012141, 1);
  return null;
end;
$$;
revoke all on function private.serialize_recurring_schedule() from public;
drop trigger if exists serialize_recurring_schedule on public.recurring_game_series;
create trigger serialize_recurring_schedule
before insert or update or delete on public.recurring_game_series
for each statement execute function private.serialize_recurring_schedule();

-- Private reference clock is a deterministic test seam; cron retains its noarg API.
create or replace function private.generate_recurring_game_events(reference_at timestamptz)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  series public.recurring_game_series%rowtype;
  week_index integer;
  wall timestamp;
  end_wall timestamp;
  instant timestamptz;
  end_instant timestamptz;
  affected integer;
  total integer := 0;
begin
  perform pg_catalog.pg_advisory_xact_lock(1987012141, 1);
  for series in select * from public.recurring_game_series
    where active and frequency = 'weekly' and starts_at <= reference_at + interval '30 days'
    order by id for update
  loop
    for week_index in 0..greatest(0,ceil(extract(epoch from
      ((reference_at + interval '30 days') - series.starts_at))/604800)::integer)
    loop
      wall := (series.starts_at at time zone series.timezone) + week_index * interval '1 week';
      end_wall := ((series.starts_at + series.duration_minutes * interval '1 minute')
        at time zone series.timezone) + week_index * interval '1 week';
      instant := wall at time zone series.timezone;
      end_instant := end_wall at time zone series.timezone;
      -- Skip only this occurrence if either endpoint is missing/ambiguous or
      -- the local end maps to a nonpositive elapsed duration at a DST boundary.
      if instant at time zone series.timezone <> wall
        or (instant - interval '1 hour') at time zone series.timezone = wall
        or (instant + interval '1 hour') at time zone series.timezone = wall
        or end_instant at time zone series.timezone <> end_wall
        or (end_instant - interval '1 hour') at time zone series.timezone = end_wall
        or (end_instant + interval '1 hour') at time zone series.timezone = end_wall
        or end_instant <= instant then continue; end if;
      if instant < reference_at or instant > reference_at + interval '30 days'
        or exists (select 1 from public.recurring_game_exceptions
          where recurring_series_id = series.id and recurring_starts_at = instant)
        then continue; end if;
      insert into public.game_events(title,starts_at,duration_minutes,max_participants,
        is_repeatable,repeat_frequency,status,created_by,recurring_series_id,recurring_starts_at)
      values (series.title,instant,(extract(epoch from (end_instant-instant))/60)::integer,
        series.max_participants,true,'weekly','scheduled',series.created_by,series.id,instant)
      on conflict (recurring_series_id,recurring_starts_at)
        where recurring_series_id is not null do nothing;
      get diagnostics affected = row_count;
      total := total + affected;
    end loop;
  end loop;
  return total;
end;
$$;
revoke all on function private.generate_recurring_game_events(timestamptz) from public;

create or replace function private.ensure_recurring_game_events()
returns integer language sql security definer set search_path = '' as $$
  select private.generate_recurring_game_events(now());
$$;

create or replace function private.lisbon_schedule_instant(wall timestamp)
returns timestamptz language plpgsql set search_path = '' as $$
declare instant timestamptz := wall at time zone 'Europe/Lisbon';
begin
  if instant at time zone 'Europe/Lisbon' <> wall
    or (instant - interval '1 hour') at time zone 'Europe/Lisbon' = wall
    or (instant + interval '1 hour') at time zone 'Europe/Lisbon' = wall then
    raise exception 'Ambiguous or nonexistent Lisbon schedule' using errcode = '22023';
  end if;
  return instant;
end;
$$;

create or replace function private.edit_game_series_schedule(
  target_game_id uuid, new_starts_at timestamptz, new_ends_at timestamptz,
  new_max_participants integer
) returns setof uuid
language plpgsql security definer set search_path = '' as $$
declare
  selected public.game_events%rowtype;
  slot record;
  anchor timestamp;
  new_wall timestamp := new_starts_at at time zone 'Europe/Lisbon';
  end_wall timestamp := new_ends_at at time zone 'Europe/Lisbon';
  mapped timestamptz;
  mapped_end timestamptz;
  forward_shift boolean;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  if new_starts_at is null or new_ends_at is null or new_max_participants is null
    or new_starts_at <= now() or new_ends_at <= new_starts_at or new_max_participants <= 0
    or date_trunc('minute',new_starts_at) <> new_starts_at
    or date_trunc('minute',new_ends_at) <> new_ends_at then
    raise exception 'Invalid schedule' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(1987012141, 1);
  -- Match lifecycle operations: template before occurrence row locks.
  perform 1 from public.recurring_game_series where id =
    (select recurring_series_id from public.game_events where id = target_game_id) for update;
  select * into selected from public.game_events where id = target_game_id for update;
  if not found or selected.status <> 'scheduled' or selected.recurring_series_id is null
    or selected.recurring_starts_at <= now() then
    raise exception 'Invalid selected occurrence' using errcode = '22023';
  end if;
  if not exists (select 1 from public.recurring_game_series
    where id = selected.recurring_series_id and timezone = 'Europe/Lisbon') then
    raise exception 'Unsupported series timezone' using errcode = '22023';
  end if;
  anchor := selected.recurring_starts_at at time zone 'Europe/Lisbon';
  forward_shift := new_wall > anchor;
  perform private.lisbon_schedule_instant(new_wall);
  perform private.lisbon_schedule_instant(end_wall);
  -- Membership uses canonical slots, never custom actual starts. Tombstones
  -- keep their actual schedule and lifecycle but follow the new identity lattice.
  for slot in select * from public.game_events
    where recurring_series_id = selected.recurring_series_id
      and recurring_starts_at >= selected.recurring_starts_at
    order by case when forward_shift then recurring_starts_at end desc,
      case when not forward_shift then recurring_starts_at end asc
    for update
  loop
    mapped := private.lisbon_schedule_instant(new_wall +
      ((slot.recurring_starts_at at time zone 'Europe/Lisbon') - anchor));
    mapped_end := private.lisbon_schedule_instant(end_wall +
      ((slot.recurring_starts_at at time zone 'Europe/Lisbon') - anchor));
    if mapped <= now() or mapped_end <= mapped then
      raise exception 'Invalid mapped schedule' using errcode = '22023';
    end if;
    update public.game_events set
      recurring_starts_at = mapped,
      starts_at = case when status = 'scheduled' then mapped else starts_at end,
      duration_minutes = case when status = 'scheduled' then
        (extract(epoch from (mapped_end - mapped)) / 60)::integer else duration_minutes end,
      max_participants = case when status = 'scheduled' then new_max_participants else max_participants end
    where id = slot.id;
    if slot.status = 'scheduled' then return next slot.id; end if;
  end loop;
  for slot in select * from public.recurring_game_exceptions
    where recurring_series_id = selected.recurring_series_id
      and recurring_starts_at >= selected.recurring_starts_at
    order by case when forward_shift then recurring_starts_at end desc,
      case when not forward_shift then recurring_starts_at end asc
    for update
  loop
    update public.recurring_game_exceptions set recurring_starts_at =
      private.lisbon_schedule_instant(new_wall +
        ((slot.recurring_starts_at at time zone 'Europe/Lisbon') - anchor))
    where id = slot.id;
  end loop;
  update public.recurring_game_series set starts_at = new_starts_at,
    duration_minutes = (extract(epoch from (new_ends_at - new_starts_at)) / 60)::integer,
    max_participants = new_max_participants
  where id = selected.recurring_series_id;
end;
$$;

create or replace function public.edit_game_series_schedule(
  target_game_id uuid, new_starts_at timestamptz, new_ends_at timestamptz,
  new_max_participants integer
) returns setof uuid language sql security invoker set search_path = '' as $$
  select * from private.edit_game_series_schedule(target_game_id, new_starts_at, new_ends_at, new_max_participants);
$$;
revoke all on function private.lisbon_schedule_instant(timestamp) from public;
revoke all on function private.edit_game_series_schedule(uuid,timestamptz,timestamptz,integer) from public;
revoke all on function public.edit_game_series_schedule(uuid,timestamptz,timestamptz,integer) from public;
grant execute on function private.edit_game_series_schedule(uuid,timestamptz,timestamptz,integer) to authenticated;
grant execute on function public.edit_game_series_schedule(uuid,timestamptz,timestamptz,integer) to authenticated;

-- A definer-controlled identity-only retime is not a cancelled-game edit.
-- Clients have no UPDATE grant on recurring_starts_at; all business/lifecycle
-- restrictions remain identical, including for an authenticated admin.
create or replace function private.prevent_cancelled_game_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'cancelled'
    and new.status = old.status
    and current_user = pg_catalog.pg_get_userbyid(
      (select relowner from pg_catalog.pg_class where oid = 'public.game_events'::regclass))
    and private.is_admin()
    and to_jsonb(new) - array['recurring_starts_at','updated_at']
      = to_jsonb(old) - array['recurring_starts_at','updated_at'] then
    return new;
  end if;
  if old.status = 'cancelled' and (
    new.status not in ('scheduled','deleted')
    or to_jsonb(new) - array['status','updated_at']
      is distinct from to_jsonb(old) - array['status','updated_at']) then
    raise exception 'Cancelled games can only be uncancelled or deleted.';
  end if;
  return new;
end;
$$;
