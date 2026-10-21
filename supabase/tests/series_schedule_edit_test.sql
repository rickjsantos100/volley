-- Local, rollback-only regression. Dates bracket next year's spring DST change.
begin;
create extension if not exists pgtap;
select no_plan();
insert into auth.users (id, email, raw_user_meta_data) values
('ee000000-0000-4000-8000-000000000001','series-admin@example.test','{}'),
('ee000000-0000-4000-8000-000000000002','series-player@example.test','{}');
update public.profiles set role = 'admin' where id = 'ee000000-0000-4000-8000-000000000001';
create temporary table schedule_fixture as select
  make_date(extract(year from now())::integer + 1, 3, 21) + time '19:00' as wall;
insert into public.recurring_game_series (id,title,starts_at,duration_minutes,max_participants,active)
select 'ee100000-0000-4000-8000-000000000001','DST fixture',wall at time zone 'Europe/Lisbon',90,12,false from schedule_fixture;
insert into public.game_events (id,title,starts_at,duration_minutes,max_participants,status,recurring_series_id,recurring_starts_at)
select ('ee200000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, 'DST slot',
  (wall + n * interval '1 week') at time zone 'Europe/Lisbon',90,12,
  (case n when 2 then 'cancelled' when 3 then 'deleted' else 'scheduled' end)::public.game_event_status,
  'ee100000-0000-4000-8000-000000000001',
  (wall + n * interval '1 week') at time zone 'Europe/Lisbon'
from schedule_fixture cross join generate_series(0,3) n;
insert into public.game_events(id,title,starts_at,duration_minutes,max_participants,recurring_series_id,recurring_starts_at)
values ('ee200000-0000-4000-8000-000000000099','Past slot',now()-interval '1 week',90,12,
 'ee100000-0000-4000-8000-000000000001',now()-interval '1 week');
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000001',true);
insert into public.game_participants(id,game_event_id,user_id)
values ('ee300000-0000-4000-8000-000000000001','ee200000-0000-4000-8000-000000000000','ee000000-0000-4000-8000-000000000002');
insert into public.game_payment_proofs(participant_id,game_event_id,user_id,manual_paid_at,manual_paid_by)
values ('ee300000-0000-4000-8000-000000000001','ee200000-0000-4000-8000-000000000000','ee000000-0000-4000-8000-000000000002',now(),'ee000000-0000-4000-8000-000000000001');
insert into public.recurring_game_exceptions(recurring_series_id,recurring_starts_at)
select 'ee100000-0000-4000-8000-000000000001',(wall + interval '4 weeks') at time zone 'Europe/Lisbon' from schedule_fixture;
grant select on schedule_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000001',true);
select lives_ok($$update public.game_events set starts_at = starts_at + interval '2 hours', duration_minutes=60,max_participants=8 where id='ee200000-0000-4000-8000-000000000001'$$,'custom occurrence edit succeeds');
select is((select starts_at=recurring_starts_at from public.game_events where id='ee200000-0000-4000-8000-000000000001'),false,'custom edit leaves canonical identity unchanged');
select lives_ok($$select public.edit_game_series_schedule('ee200000-0000-4000-8000-000000000000',
 (wall + interval '1 day 1 hour') at time zone 'Europe/Lisbon',
 (wall + interval '1 day 3 hours') at time zone 'Europe/Lisbon',16) from schedule_fixture$$,'admin series RPC succeeds');
select is((select count(*)::integer from public.game_events where recurring_series_id='ee100000-0000-4000-8000-000000000001' and status='scheduled' and starts_at=recurring_starts_at and duration_minutes=120 and max_participants=16 and (starts_at at time zone 'Europe/Lisbon')::time=time '20:00'),2,'scheduled slots reset to requested wall time across DST');
select is((select extract(epoch from (max(starts_at)-min(starts_at)))::integer from public.game_events where recurring_series_id='ee100000-0000-4000-8000-000000000001' and status='scheduled' and max_participants=16),601200,'weekly interval across spring DST is 167 hours');
select is((select starts_at from public.game_events where id='ee200000-0000-4000-8000-000000000099'),now()-interval '1 week','past slot remains untouched');
select is((select count(*) from public.game_payment_proofs p join public.game_participants g on g.id=p.participant_id where g.id='ee300000-0000-4000-8000-000000000001' and p.manual_paid_at=now() and g.game_event_id='ee200000-0000-4000-8000-000000000000'),1::bigint,'participant ID and payment survive series edit');
select is((select count(*)::integer from public.game_events where recurring_series_id='ee100000-0000-4000-8000-000000000001' and status in ('cancelled','deleted') and (recurring_starts_at at time zone 'Europe/Lisbon')::time=time '20:00' and (starts_at at time zone 'Europe/Lisbon')::time=time '19:00'),2,'cancelled/deleted identity moves without changing lifecycle or actual schedule');
select is((select (recurring_starts_at at time zone 'Europe/Lisbon')::time from public.recurring_game_exceptions where recurring_series_id='ee100000-0000-4000-8000-000000000001'),time '20:00','exception follows new canonical schedule');
select throws_ok($$select public.edit_game_series_schedule('ee200000-0000-4000-8000-000000000000',now()+interval '1 day',now()+interval '2 days',0)$$,'22023','Invalid schedule','invalid input rejected atomically');
select is((select max_participants from public.recurring_game_series where id='ee100000-0000-4000-8000-000000000001'),16,'failed edit leaves template unchanged');
reset role;
insert into public.recurring_game_exceptions(recurring_series_id,recurring_starts_at)
select id,starts_at-interval '1 week' from public.recurring_game_series where id='ee100000-0000-4000-8000-000000000001';
set local role authenticated;
select throws_ok($$select public.edit_game_series_schedule(g.id,g.starts_at-interval '5 weeks',g.starts_at-interval '5 weeks'+interval '3 hours',20)
from public.game_events g where g.id='ee200000-0000-4000-8000-000000000000'$$,'23505',null,'late exception collision rolls entire edit back');
select is((select count(*)::integer from public.game_events where recurring_series_id='ee100000-0000-4000-8000-000000000001' and status='scheduled' and starts_at=recurring_starts_at and max_participants=16),2,'occurrence updates roll back after late failure');
select is((select max_participants from public.recurring_game_series where id='ee100000-0000-4000-8000-000000000001'),16,'late failure leaves template intact');
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.edit_game_series_schedule('ee200000-0000-4000-8000-000000000000',now()+interval '1 day',now()+interval '2 days',12)$$,'42501','Administrator required','non-admin denied');
reset role;
set local role anon;
select throws_ok($$select public.edit_game_series_schedule('ee200000-0000-4000-8000-000000000000',now()+interval '1 day',now()+interval '2 days',12)$$,'42501','permission denied for function edit_game_series_schedule','anonymous denied');
reset role;
-- A current rolling window exercises the actual generator, not a mock.
insert into public.recurring_game_series(id,title,starts_at,duration_minutes,max_participants,active)
values ('ee100000-0000-4000-8000-000000000002','Rolling fixture',
 ((now() at time zone 'Europe/Lisbon')::date + 2 + time '19:00') at time zone 'Europe/Lisbon',90,12,true);
update public.game_events set status='deleted' where id=(select id from public.game_events
 where recurring_series_id='ee100000-0000-4000-8000-000000000002' order by recurring_starts_at offset 2 limit 1);
create temporary table rolling_before as select count(*) as total from public.game_events where recurring_series_id='ee100000-0000-4000-8000-000000000002';
insert into public.recurring_game_exceptions(recurring_series_id,recurring_starts_at)
select recurring_series_id,recurring_starts_at from public.game_events where recurring_series_id='ee100000-0000-4000-8000-000000000002' order by recurring_starts_at offset 3 limit 1;
delete from public.game_events where recurring_series_id='ee100000-0000-4000-8000-000000000002' and recurring_starts_at in
 (select recurring_starts_at from public.recurring_game_exceptions where recurring_series_id='ee100000-0000-4000-8000-000000000002');
update rolling_before set total=total-1;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000001',true);
select public.edit_game_series_schedule(id,starts_at+interval '1 hour',starts_at+interval '3 hours',18)
from public.game_events where recurring_series_id='ee100000-0000-4000-8000-000000000002' order by recurring_starts_at limit 1;
select private.ensure_recurring_game_events();
select is((select count(*) from public.game_events where recurring_series_id='ee100000-0000-4000-8000-000000000002'),(select total from rolling_before),'generation after edit creates no duplicates');
select is((select count(*) from public.game_events where recurring_series_id='ee100000-0000-4000-8000-000000000002' and status='deleted'),1::bigint,'generation preserves deleted tombstone');
select is((select count(*) from public.game_events g join public.recurring_game_exceptions e using(recurring_series_id,recurring_starts_at) where g.recurring_series_id='ee100000-0000-4000-8000-000000000002'),0::bigint,'generation does not resurrect exception');
-- Consecutive identities must be moved tail-first forward, head-first backward.
insert into public.recurring_game_exceptions(recurring_series_id,recurring_starts_at)
select recurring_series_id,recurring_starts_at from public.game_events
where id in ('ee200000-0000-4000-8000-000000000000','ee200000-0000-4000-8000-000000000001');
select lives_ok($$select public.edit_game_series_schedule(id,
 ((starts_at at time zone 'Europe/Lisbon')+interval '1 week') at time zone 'Europe/Lisbon',
 ((starts_at at time zone 'Europe/Lisbon')+interval '1 week 2 hours') at time zone 'Europe/Lisbon',16)
 from public.game_events where id='ee200000-0000-4000-8000-000000000000'$$,
 'forward whole week moves consecutive events and exceptions without transient collision');
select lives_ok($$select public.edit_game_series_schedule(id,
 ((starts_at at time zone 'Europe/Lisbon')-interval '1 week') at time zone 'Europe/Lisbon',
 ((starts_at at time zone 'Europe/Lisbon')-interval '1 week'+interval '2 hours') at time zone 'Europe/Lisbon',16)
 from public.game_events where id='ee200000-0000-4000-8000-000000000000'$$,
 'backward whole week moves consecutive events and exceptions without transient collision');
select is((select count(*) from public.game_events g join public.recurring_game_exceptions e
 using(recurring_series_id,recurring_starts_at) where g.id in
 ('ee200000-0000-4000-8000-000000000000','ee200000-0000-4000-8000-000000000001')),2::bigint,
 'events and consecutive exceptions keep matching identities after round trip');

-- Actual generator with a private reference clock, not hand-inserted occurrences.
insert into public.recurring_game_series(id,title,starts_at,duration_minutes,max_participants,active)
values
 ('ee100000-0000-4000-8000-000000000003','Missing start','2027-03-21 01:30 Europe/Lisbon',30,12,false),
 ('ee100000-0000-4000-8000-000000000004','Missing end','2027-03-21 00:30 Europe/Lisbon',60,12,false),
 ('ee100000-0000-4000-8000-000000000005','Valid overnight','2027-03-21 00:30 Europe/Lisbon',150,12,false),
 ('ee100000-0000-4000-8000-000000000006','Ambiguous start','2027-10-24 01:30 Europe/Lisbon',90,12,false),
 ('ee100000-0000-4000-8000-000000000007','Ambiguous end','2027-10-24 00:30 Europe/Lisbon',60,12,false);
update public.recurring_game_series set active=true where id in
 ('ee100000-0000-4000-8000-000000000003','ee100000-0000-4000-8000-000000000004',
 'ee100000-0000-4000-8000-000000000005','ee100000-0000-4000-8000-000000000006',
 'ee100000-0000-4000-8000-000000000007');
select lives_ok($$select private.generate_recurring_game_events('2027-03-20Z')$$,
 'spring invalid slot does not abort generation of other series');
select is((select count(*) from public.game_events where recurring_series_id in
 ('ee100000-0000-4000-8000-000000000003','ee100000-0000-4000-8000-000000000004')
 and (starts_at at time zone 'Europe/Lisbon')::date='2027-03-28'),0::bigint,
 'nonexistent start or end skips only the DST occurrence');
select is((select count(*) from public.game_events where recurring_series_id in
 ('ee100000-0000-4000-8000-000000000003','ee100000-0000-4000-8000-000000000004')
 and (starts_at at time zone 'Europe/Lisbon')::date='2027-04-04'),2::bigint,
 'valid following week still generated for both skipped series');
select is((select duration_minutes from public.game_events where recurring_series_id=
 'ee100000-0000-4000-8000-000000000005' and starts_at='2027-03-28 00:30 Europe/Lisbon'),90,
 'fresh spring overnight occurrence preserves 00:30 to 03:00 wall endpoints');
select lives_ok($$select private.generate_recurring_game_events('2027-10-23Z')$$,
 'autumn ambiguous slots do not abort generation');
select is((select count(*) from public.game_events where recurring_series_id in
 ('ee100000-0000-4000-8000-000000000006','ee100000-0000-4000-8000-000000000007')
 and (starts_at at time zone 'Europe/Lisbon')::date='2027-10-31'),0::bigint,
 'ambiguous start or end skips autumn occurrence');
set local role authenticated;
select throws_ok($$select private.generate_recurring_game_events('2027-03-20Z')$$,
 '42501','permission denied for function generate_recurring_game_events',
 'authenticated clients cannot invoke the private reference clock');
reset role;
select * from finish();
rollback;
