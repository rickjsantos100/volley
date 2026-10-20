-- Run with supabase test db, or psql -v ON_ERROR_STOP=1 -f this-file.
-- All fixtures and mutations roll back; no insertion guards are disabled.
begin;
create extension if not exists pgtap;
select plan(26);

insert into auth.users (id, email, raw_user_meta_data)
select ('ca000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
       'admin-add-' || n || '@example.test', '{"display_name":"Admin add test"}'::jsonb
from generate_series(1, 5) n;
update public.profiles set role = 'admin'
where id = 'ca000000-0000-4000-8000-000000000001';
insert into public.game_events (id, title, starts_at, duration_minutes, max_participants, status)
values
('ca100000-0000-4000-8000-000000000001', 'Admin add open', now() + interval '7 days', 90, 1, 'scheduled'),
('ca100000-0000-4000-8000-000000000002', 'Admin add cancelled', now() + interval '7 days', 90, 1, 'cancelled'),
('ca100000-0000-4000-8000-000000000003', 'Admin add deleted', now() + interval '7 days', 90, 1, 'deleted'),
('ca100000-0000-4000-8000-000000000004', 'Admin add past', now() - interval '1 day', 90, 1, 'scheduled'),
('ca100000-0000-4000-8000-000000000005', 'Admin add self', now() + interval '7 days', 90, 1, 'scheduled');

select ok(not (select prosecdef from pg_proc where oid = 'public.admin_add_game_player(uuid,uuid)'::regprocedure), 'public RPC is invoker');
select ok((select prosecdef from pg_proc where oid = 'private.admin_add_game_player(uuid,uuid)'::regprocedure), 'privileged helper is private');
select ok(not has_function_privilege('anon', 'public.admin_add_game_player(uuid,uuid)', 'execute'), 'anonymous cannot execute wrapper');
select ok(not has_function_privilege('anon', 'private.admin_add_game_player(uuid,uuid)', 'execute'), 'anonymous cannot execute helper');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'ca000000-0000-4000-8000-000000000002', true);
select throws_ok($$select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000002')$$,
 'P0001', 'Only admins can add players.', 'regular user denied');
select throws_ok($$select * from private.admin_add_game_player('ca100000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000002')$$,
 'P0001', 'Only admins can add players.', 'direct helper also checks admin');
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000002')$$,
 'P0001', 'Only admins can add players.', 'missing identity denied');

select set_config('request.jwt.claim.sub', 'ca000000-0000-4000-8000-000000000001', true);
-- Capture actual RPC return values as the authenticated admin.
create temporary table placements as
select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000002');
select is((select destination from placements), 'participant', 'open capacity routes to roster');
select ok((select participant_id is not null and waitlist_entry_id is null from placements), 'roster return IDs');
select is((select p.id from public.game_participants p where p.user_id = 'ca000000-0000-4000-8000-000000000002'),
          (select participant_id from placements), 'returned participant exists');
reset role;
select is((select source::text from public.game_participants where id = (select participant_id from placements)), 'admin_added', 'source metadata');
select is((select added_by from public.game_participants where id = (select participant_id from placements)),
          'ca000000-0000-4000-8000-000000000001'::uuid, 'actor metadata');
set local role authenticated;
select throws_ok($$select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000002')$$,
 'P0001', 'Player is already in this game or on its waitlist.', 'roster duplicate denied');
delete from placements;
insert into placements select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000003');
select is((select destination from placements), 'waitlist', 'full capacity routes to waitlist');
select ok((select participant_id is null and waitlist_entry_id is not null from placements), 'waitlist return IDs');
select is((select w.id from public.game_waitlist_entries w where w.user_id = 'ca000000-0000-4000-8000-000000000003'),
          (select waitlist_entry_id from placements), 'returned waitlist entry exists');
select throws_ok($$select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000003')$$,
 'P0001', 'Player is already in this game or on its waitlist.', 'active waitlist duplicate denied');
select lives_ok($$select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000004')$$, 'second waitlist addition');
reset role;
select is((select waitlist_order from public.game_waitlist_entries where user_id = 'ca000000-0000-4000-8000-000000000004'), 2, 'appended after first active entry');
select is((select status::text from public.game_waitlist_entries where user_id = 'ca000000-0000-4000-8000-000000000004'), 'active', 'new entry active');
set local role authenticated;
select throws_ok($$select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000005')$$,
 'P0001', 'This game is not available to join.', 'cancelled excluded');
select throws_ok($$select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000005')$$,
 'P0001', 'This game is not available to join.', 'deleted excluded');
select throws_ok($$select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000004', 'ca000000-0000-4000-8000-000000000005')$$,
 'P0001', 'This game is not available to join.', 'past excluded');
select throws_ok($$select * from public.admin_add_game_player('ca100000-0000-4000-8000-999999999999', 'ca000000-0000-4000-8000-000000000005')$$,
 'P0001', 'This game is not available to join.', 'missing game excluded');
select throws_ok($$select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-999999999999')$$,
 'P0001', 'Player not found.', 'missing player excluded');
select * from public.admin_add_game_player('ca100000-0000-4000-8000-000000000005', 'ca000000-0000-4000-8000-000000000001');
reset role;
select is((select source::text from public.game_participants where game_event_id = 'ca100000-0000-4000-8000-000000000005'), 'admin_added', 'admin adding self is still admin source');
select * from finish();
rollback;
