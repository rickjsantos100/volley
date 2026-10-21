-- Local only; every fixture and mutation rolls back. No guards are disabled.
begin;
create extension if not exists pgtap;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
('ed000000-0000-4000-8000-000000000001', 'edit-admin@example.test', '{"display_name":"Edit admin"}'),
('ed000000-0000-4000-8000-000000000002', 'edit-player@example.test', '{"display_name":"Edit player"}');
update public.profiles set role = 'admin' where id = 'ed000000-0000-4000-8000-000000000001';
insert into public.game_events (id, title, starts_at, duration_minutes, max_participants)
values ('ed100000-0000-4000-8000-000000000001', 'Edit fixture', now() + interval '7 days', 90, 12);
insert into public.recurring_game_series (id, title, starts_at, duration_minutes, max_participants, active)
values ('ed200000-0000-4000-8000-000000000001', 'Edit template', now() + interval '7 days', 90, 12, false);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'ed000000-0000-4000-8000-000000000001', true);
select lives_ok($$update public.game_events set title = 'Edited', starts_at = now() + interval '8 days', duration_minutes = 120, max_participants = 16, status = 'cancelled' where id = 'ed100000-0000-4000-8000-000000000001'$$, 'admin saves all current game fields and status together');
select is((select title || ':' || duration_minutes || ':' || max_participants || ':' || status from public.game_events where id = 'ed100000-0000-4000-8000-000000000001'), 'Edited:120:16:cancelled', 'game changes persist');
select is((select starts_at from public.game_events where id = 'ed100000-0000-4000-8000-000000000001'), now() + interval '8 days', 'game date and time persist');
select lives_ok($$update public.game_events set status = 'scheduled' where id = 'ed100000-0000-4000-8000-000000000001'$$, 'uncancel remains allowed');
select lives_ok($$update public.recurring_game_series set title = 'Edited template', starts_at = now() + interval '9 days', duration_minutes = 150, max_participants = 18, active = true where id = 'ed200000-0000-4000-8000-000000000001'$$, 'admin saves template and existing lifecycle flag');
select is((select title || ':' || duration_minutes || ':' || max_participants || ':' || active from public.recurring_game_series where id = 'ed200000-0000-4000-8000-000000000001'), 'Edited template:150:18:true', 'template changes persist');
select is((select starts_at from public.recurring_game_series where id = 'ed200000-0000-4000-8000-000000000001'), now() + interval '9 days', 'template date and time persist');

-- Even admins cannot write identity, audit, or recurrence linkage columns.
select throws_ok(format('update public.%I set %I = %I', tbl, col, col), '42501', format('permission denied for table %s', tbl), 'admin cannot update ' || tbl || '.' || col)
from (values ('game_events', 'id'), ('game_events', 'created_by'), ('game_events', 'created_at'), ('game_events', 'updated_at'), ('game_events', 'recurring_series_id'), ('game_events', 'recurring_starts_at'), ('recurring_game_series', 'id'), ('recurring_game_series', 'created_by'), ('recurring_game_series', 'created_at'), ('recurring_game_series', 'updated_at')) protected(tbl, col);

select set_config('request.jwt.claim.sub', 'ed000000-0000-4000-8000-000000000002', true);
with changed as (update public.game_events set title = 'Forbidden', starts_at = now() + interval '10 days', duration_minutes = 30, max_participants = 1, status = 'cancelled' returning id)
select is(count(*)::integer, 0, 'ordinary user cannot edit any game business fields or status') from changed;
with changed as (update public.recurring_game_series set title = 'Forbidden', starts_at = now() + interval '10 days', duration_minutes = 30, max_participants = 1, active = false returning id)
select is(count(*)::integer, 0, 'ordinary user cannot edit template or active flag') from changed;
select throws_ok(format('update public.%I set %I = %I', tbl, col, col), '42501', format('permission denied for table %s', tbl), 'ordinary user cannot update ' || tbl || '.' || col)
from (values ('game_events', 'id'), ('game_events', 'created_by'), ('game_events', 'created_at'), ('game_events', 'updated_at'), ('game_events', 'recurring_series_id'), ('game_events', 'recurring_starts_at'), ('recurring_game_series', 'id'), ('recurring_game_series', 'created_by'), ('recurring_game_series', 'created_at'), ('recurring_game_series', 'updated_at')) protected(tbl, col);

reset role;
set local role anon;
select throws_ok(format('update public.%I set %I = %I', tbl, col, col), '42501', format('permission denied for table %s', tbl), 'anon cannot update ' || tbl || '.' || col)
from (values ('game_events'), ('recurring_game_series')) tables(tbl)
cross join (values ('title'), ('starts_at'), ('duration_minutes'), ('max_participants'), ('id'), ('created_by'), ('created_at'), ('updated_at')) cols(col);
select throws_ok('update public.game_events set status = status', '42501', 'permission denied for table game_events', 'anon cannot change game status');
select throws_ok('update public.recurring_game_series set active = active', '42501', 'permission denied for table recurring_game_series', 'anon cannot change series lifecycle');
reset role;
select * from finish();
rollback;
