with test_users as (
  select *
  from (
    values
      ('90000000-0000-4000-8000-000000000001'::uuid, 'test.player01@voley.local', 'Ana Costa'),
      ('90000000-0000-4000-8000-000000000002'::uuid, 'test.player02@voley.local', 'Bruno Silva'),
      ('90000000-0000-4000-8000-000000000003'::uuid, 'test.player03@voley.local', 'Carla Mendes'),
      ('90000000-0000-4000-8000-000000000004'::uuid, 'test.player04@voley.local', 'Diogo Rocha'),
      ('90000000-0000-4000-8000-000000000005'::uuid, 'test.player05@voley.local', 'Eva Martins'),
      ('90000000-0000-4000-8000-000000000006'::uuid, 'test.player06@voley.local', 'Filipe Santos'),
      ('90000000-0000-4000-8000-000000000007'::uuid, 'test.player07@voley.local', 'Gabriela Lopes'),
      ('90000000-0000-4000-8000-000000000008'::uuid, 'test.player08@voley.local', 'Hugo Ferreira'),
      ('90000000-0000-4000-8000-000000000009'::uuid, 'test.player09@voley.local', 'Ines Almeida'),
      ('90000000-0000-4000-8000-000000000010'::uuid, 'test.player10@voley.local', 'Joao Pereira'),
      ('90000000-0000-4000-8000-000000000011'::uuid, 'test.player11@voley.local', 'Lara Gomes'),
      ('90000000-0000-4000-8000-000000000012'::uuid, 'test.player12@voley.local', 'Miguel Nunes')
  ) as users(id, email, display_name)
)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
select
  id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  email,
  null,
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', display_name),
  now(),
  now(),
  '',
  '',
  '',
  ''
from test_users
on conflict (id) do nothing;

with test_users as (
  select *
  from (
    values
      ('90000000-0000-4000-8000-000000000001'::uuid, 'test.player01@voley.local', 'Ana Costa'),
      ('90000000-0000-4000-8000-000000000002'::uuid, 'test.player02@voley.local', 'Bruno Silva'),
      ('90000000-0000-4000-8000-000000000003'::uuid, 'test.player03@voley.local', 'Carla Mendes'),
      ('90000000-0000-4000-8000-000000000004'::uuid, 'test.player04@voley.local', 'Diogo Rocha'),
      ('90000000-0000-4000-8000-000000000005'::uuid, 'test.player05@voley.local', 'Eva Martins'),
      ('90000000-0000-4000-8000-000000000006'::uuid, 'test.player06@voley.local', 'Filipe Santos'),
      ('90000000-0000-4000-8000-000000000007'::uuid, 'test.player07@voley.local', 'Gabriela Lopes'),
      ('90000000-0000-4000-8000-000000000008'::uuid, 'test.player08@voley.local', 'Hugo Ferreira'),
      ('90000000-0000-4000-8000-000000000009'::uuid, 'test.player09@voley.local', 'Ines Almeida'),
      ('90000000-0000-4000-8000-000000000010'::uuid, 'test.player10@voley.local', 'Joao Pereira'),
      ('90000000-0000-4000-8000-000000000011'::uuid, 'test.player11@voley.local', 'Lara Gomes'),
      ('90000000-0000-4000-8000-000000000012'::uuid, 'test.player12@voley.local', 'Miguel Nunes')
  ) as users(id, email, display_name)
)
insert into public.profiles (id, email, display_name, role)
select id, email, display_name, 'user'::public.profile_role
from test_users
on conflict (id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  updated_at = now();

with next_week as (
  select date_trunc('week', now() at time zone 'Europe/Lisbon') + interval '7 days' as monday
), seed_series as (
  select
    id::uuid,
    title,
    (next_week.monday + day_offset + (start_time - time '00:00')) at time zone 'Europe/Lisbon' as starts_at,
    duration_minutes,
    max_participants
  from next_week
  cross join (
    values
      ('91000000-0000-4000-8000-000000000001', 'Test weekly Monday 19:00', interval '0 days', time '19:00', 90, 6),
      ('91000000-0000-4000-8000-000000000002', 'Test weekly Wednesday 20:00', interval '2 days', time '20:00', 90, 6)
  ) as series(id, title, day_offset, start_time, duration_minutes, max_participants)
)
insert into public.recurring_game_series (
  id,
  title,
  starts_at,
  duration_minutes,
  max_participants,
  frequency,
  timezone,
  active
)
select
  id,
  title,
  starts_at,
  duration_minutes,
  max_participants,
  'weekly',
  'Europe/Lisbon',
  true
from seed_series
on conflict (id) do update
set
  title = excluded.title,
  starts_at = excluded.starts_at,
  duration_minutes = excluded.duration_minutes,
  max_participants = excluded.max_participants,
  active = true,
  updated_at = now();

select private.ensure_recurring_game_events();

with next_week as (
  select date_trunc('week', now() at time zone 'Europe/Lisbon') + interval '7 days' as monday
), seed_games as (
  select
    id::uuid,
    title,
    (next_week.monday + day_offset + (start_time - time '00:00')) at time zone 'Europe/Lisbon' as starts_at,
    duration_minutes,
    max_participants
  from next_week
  cross join (
    values
      ('92000000-0000-4000-8000-000000000001', 'Test one-off Thursday full + waitlist', interval '3 days', time '19:30', 90, 6),
      ('92000000-0000-4000-8000-000000000002', 'Test one-off Friday open', interval '4 days', time '20:00', 90, 6),
      ('92000000-0000-4000-8000-000000000003', 'Test one-off Saturday full', interval '5 days', time '11:00', 120, 6)
  ) as games(id, title, day_offset, start_time, duration_minutes, max_participants)
)
insert into public.game_events (
  id,
  title,
  starts_at,
  duration_minutes,
  max_participants,
  is_repeatable,
  repeat_frequency,
  status
)
select
  id,
  title,
  starts_at,
  duration_minutes,
  max_participants,
  false,
  null,
  'scheduled'::public.game_event_status
from seed_games
on conflict (id) do update
set
  title = excluded.title,
  starts_at = excluded.starts_at,
  duration_minutes = excluded.duration_minutes,
  max_participants = excluded.max_participants,
  status = excluded.status,
  updated_at = now();

with ranked_recurring_games as (
  select
    case recurring_series_id
      when '91000000-0000-4000-8000-000000000001'::uuid then 'weekly-full-waitlist'
      when '91000000-0000-4000-8000-000000000002'::uuid then 'weekly-open'
    end as seed_key,
    id as game_event_id,
    row_number() over (partition by recurring_series_id order by starts_at) as occurrence_rank
  from public.game_events
  where recurring_series_id in (
    '91000000-0000-4000-8000-000000000001'::uuid,
    '91000000-0000-4000-8000-000000000002'::uuid
  )
    and status = 'scheduled'
), all_target_games as (
  select seed_key, game_event_id
  from ranked_recurring_games
  where occurrence_rank = 1
  union all values
    ('one-off-full-waitlist', '92000000-0000-4000-8000-000000000001'::uuid),
    ('one-off-open', '92000000-0000-4000-8000-000000000002'::uuid),
    ('one-off-full', '92000000-0000-4000-8000-000000000003'::uuid)
), participant_seed as (
  select *
  from all_target_games
  join lateral (
    select user_id
    from (
      values
        ('90000000-0000-4000-8000-000000000001'::uuid, 1),
        ('90000000-0000-4000-8000-000000000002'::uuid, 2),
        ('90000000-0000-4000-8000-000000000003'::uuid, 3),
        ('90000000-0000-4000-8000-000000000004'::uuid, 4),
        ('90000000-0000-4000-8000-000000000005'::uuid, 5),
        ('90000000-0000-4000-8000-000000000006'::uuid, 6)
    ) as users(user_id, player_number)
    where player_number <= case
      when seed_key in ('weekly-full-waitlist', 'one-off-full-waitlist', 'one-off-full') then 6
      when seed_key = 'weekly-open' then 4
      else 2
    end
  ) as selected_users on true
)
insert into public.game_participants (game_event_id, user_id, source)
select game_event_id, user_id, 'admin_added'::public.game_participant_source
from participant_seed
on conflict (game_event_id, user_id) do nothing;

with ranked_recurring_games as (
  select
    id as game_event_id,
    row_number() over (order by starts_at) as occurrence_rank
  from public.game_events
  where recurring_series_id = '91000000-0000-4000-8000-000000000001'::uuid
    and status = 'scheduled'
), waitlist_seed as (
  select
    ranked_recurring_games.game_event_id,
    users.user_id,
    users.waitlist_order
  from ranked_recurring_games
  cross join (
    values
      ('90000000-0000-4000-8000-000000000007'::uuid, 1),
      ('90000000-0000-4000-8000-000000000008'::uuid, 2),
      ('90000000-0000-4000-8000-000000000009'::uuid, 3)
  ) as users(user_id, waitlist_order)
  where ranked_recurring_games.occurrence_rank = 1
  union all
  select
    '92000000-0000-4000-8000-000000000001'::uuid,
    users.user_id,
    users.waitlist_order
  from (
    values
      ('90000000-0000-4000-8000-000000000010'::uuid, 1),
      ('90000000-0000-4000-8000-000000000011'::uuid, 2)
  ) as users(user_id, waitlist_order)
)
insert into public.game_waitlist_entries (
  game_event_id,
  user_id,
  status,
  waitlist_order
)
select
  game_event_id,
  user_id,
  'active'::public.game_waitlist_status,
  waitlist_order
from waitlist_seed
on conflict (game_event_id, user_id)
where status = 'active'
do nothing;
