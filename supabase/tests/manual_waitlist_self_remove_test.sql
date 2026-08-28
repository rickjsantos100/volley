-- Manual pgTAP coverage for player self-remove waitlist RLS.
--
-- Run against the local Supabase database:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -f supabase/tests/manual_waitlist_self_remove_test.sql
--
-- Covers the policy added in 20260828120000_allow_player_waitlist_self_remove.sql:
--   * own active entry delete succeeds
--   * another user's active entry delete is filtered by RLS (0 rows)
--   * cancelled-game entry delete is filtered by RLS (0 rows)
--   * admin delete of any active entry remains allowed
--
-- The insert trigger that normally guards waitlist inserts (capacity, status,
-- ownership) is disabled for the seeding section only. This test exercises the
-- delete RLS policy, not the insert trigger, so bypassing it keeps the fixture
-- focused. The trigger is re-enabled after seeding; there is no delete trigger
-- on this table, so the delete assertions are unaffected.

begin;

-- pgTAP is not installed by default in the local stack. Install it inside the
-- transaction so the test is self-contained; the install is rolled back with
-- the rest of the session and does not alter shared schema/history.
create extension if not exists pgtap;

select plan(5);

-- Seed as the superuser connection; RLS is bypassed for the postgres role.
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
values
  (
    'b0000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'waitlist-admin@example.test',
    null,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Waitlist Admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'waitlist-player-one@example.test',
    null,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Waitlist Player One"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'waitlist-player-two@example.test',
    null,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Waitlist Player Two"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

-- Profiles are auto-created by the on_auth_user_created trigger. Promote the
-- admin user's role; the player profiles stay as the default 'user' role.
update public.profiles
set role = 'admin'
where id = 'b0000000-0000-4000-8000-000000000001';

insert into public.game_events (
  id,
  title,
  starts_at,
  duration_minutes,
  max_participants,
  status,
  created_by
)
values
  (
    'b1000000-0000-4000-8000-000000000001',
    'Waitlist self-remove scheduled game',
    now() + interval '7 days',
    90,
    12,
    'scheduled',
    'b0000000-0000-4000-8000-000000000001'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'Waitlist self-remove cancelled game',
    now() + interval '8 days',
    90,
    12,
    'cancelled',
    'b0000000-0000-4000-8000-000000000001'
  );

-- Bypass the insert guard so we can place waitlist rows on a not-full game and
-- on a cancelled game without exercising capacity/status insert logic.
alter table public.game_waitlist_entries
  disable trigger ensure_game_waitlist_entry_can_insert;

insert into public.game_waitlist_entries (
  id,
  game_event_id,
  user_id,
  status,
  waitlist_order,
  joined_waitlist_at
)
values
  (
    'b2000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002',
    'active',
    1,
    now()
  ),
  (
    'b2000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000003',
    'active',
    2,
    now()
  ),
  (
    'b2000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000002',
    'active',
    1,
    now()
  );

alter table public.game_waitlist_entries
  enable trigger ensure_game_waitlist_entry_can_insert;

-- 1. Owner can delete their own active entry on a scheduled game.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

with deleted as (
  delete from public.game_waitlist_entries
  where id = 'b2000000-0000-4000-8000-000000000001'
  returning id
)
select is(count(*), 1::bigint, 'owner can delete their own active waitlist entry')
from deleted;

reset role;

-- 2. A player cannot delete another player's active entry (RLS filters to 0).
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

with deleted as (
  delete from public.game_waitlist_entries
  where id = 'b2000000-0000-4000-8000-000000000002'
  returning id
)
select is(count(*), 0::bigint, 'player cannot delete another player waitlist entry')
from deleted;

reset role;

select ok(
  exists (
    select 1
    from public.game_waitlist_entries
    where id = 'b2000000-0000-4000-8000-000000000002'
  ),
  'another player entry survives the unauthorized delete attempt'
);

-- 3. A player cannot delete their own entry on a cancelled game.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

with deleted as (
  delete from public.game_waitlist_entries
  where id = 'b2000000-0000-4000-8000-000000000003'
  returning id
)
select is(count(*), 0::bigint, 'player cannot delete a cancelled-game waitlist entry')
from deleted;

reset role;

-- 4. Admin can still delete any active entry on a scheduled game.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

with deleted as (
  delete from public.game_waitlist_entries
  where id = 'b2000000-0000-4000-8000-000000000002'
  returning id
)
select is(count(*), 1::bigint, 'admin can delete a scheduled-game waitlist entry')
from deleted;

reset role;

select * from finish();
rollback;
