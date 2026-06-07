with next_week as (
  select date_trunc('week', now() at time zone 'Europe/Lisbon') + interval '7 days' as monday
),
seed_games as (
  select
    id::uuid,
    title,
    (
      next_week.monday + day_offset + (start_time - time '00:00')
    ) at time zone 'Europe/Lisbon' as starts_at,
    duration_minutes,
    max_participants,
    is_repeatable,
    repeat_frequency,
    case
      when is_repeatable then
        (
          next_week.monday + day_offset + (start_time - time '00:00') + interval '8 weeks'
        ) at time zone 'Europe/Lisbon'
      else null
    end as repeat_ends_at
  from next_week
  cross join (
    values
      ('11111111-1111-4111-8111-111111111111', 'Monday volleyball', interval '0 days', time '19:00', 90, 12, true, 'weekly'),
      ('22222222-2222-4222-8222-222222222222', 'Tuesday volleyball', interval '1 day', time '20:00', 90, 12, false, null),
      ('33333333-3333-4333-8333-333333333333', 'Wednesday volleyball', interval '2 days', time '19:30', 90, 10, true, 'weekly'),
      ('44444444-4444-4444-8444-444444444444', 'Thursday volleyball', interval '3 days', time '20:30', 90, 12, false, null),
      ('55555555-5555-4555-8555-555555555555', 'Friday volleyball', interval '4 days', time '19:00', 120, 14, true, 'weekly'),
      ('66666666-6666-4666-8666-666666666666', 'Saturday volleyball', interval '5 days', time '11:00', 120, 16, false, null),
      ('77777777-7777-4777-8777-777777777777', 'Sunday volleyball', interval '6 days', time '17:00', 90, 12, true, 'weekly')
  ) as games (
    id,
    title,
    day_offset,
    start_time,
    duration_minutes,
    max_participants,
    is_repeatable,
    repeat_frequency
  )
)
insert into public.game_events (
  id,
  title,
  starts_at,
  duration_minutes,
  max_participants,
  is_repeatable,
  repeat_frequency,
  repeat_ends_at,
  status
)
select
  id,
  title,
  starts_at,
  duration_minutes,
  max_participants,
  is_repeatable,
  repeat_frequency,
  repeat_ends_at,
  'scheduled'::public.game_event_status
from seed_games
on conflict (id) do update
set
  title = excluded.title,
  starts_at = excluded.starts_at,
  duration_minutes = excluded.duration_minutes,
  max_participants = excluded.max_participants,
  is_repeatable = excluded.is_repeatable,
  repeat_frequency = excluded.repeat_frequency,
  repeat_ends_at = excluded.repeat_ends_at,
  status = excluded.status,
  updated_at = now();
