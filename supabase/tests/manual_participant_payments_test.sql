begin;

select plan(15);

select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);

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
    'a0000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'manual-payment-admin@example.test',
    null,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Payment Admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'manual-payment-player@example.test',
    null,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Payment Player"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

update public.profiles
set role = 'admin'
where id = 'a0000000-0000-4000-8000-000000000001';

insert into public.game_events (
  id,
  starts_at,
  duration_minutes,
  max_participants,
  status,
  created_by
)
values (
  'a1000000-0000-4000-8000-000000000001',
  now() + interval '7 days',
  90,
  12,
  'scheduled',
  'a0000000-0000-4000-8000-000000000001'
);

insert into public.game_participants (
  id,
  game_event_id,
  user_id,
  added_by,
  source
)
values (
  'a2000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'admin_added'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    select public.set_game_participant_manual_paid(
      'a1000000-0000-4000-8000-000000000001',
      'a2000000-0000-4000-8000-000000000001',
      true
    )
  $$,
  'P0001',
  'Only admins can change manual payment state.',
  'normal players cannot mark themselves paid'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.set_game_participant_manual_paid(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    true
  ),
  'marked-paid',
  'admins can mark a participant paid'
);

select ok(
  (
    select manual_paid_at is not null
    from public.game_payment_proofs
    where participant_id = 'a2000000-0000-4000-8000-000000000001'
  ),
  'manual payment records its timestamp'
);

select is(
  (
    select manual_paid_by
    from public.game_payment_proofs
    where participant_id = 'a2000000-0000-4000-8000-000000000001'
  ),
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'manual payment records the admin'
);

select is(
  (
    select payment_is_paid
    from public.game_participant_details
    where id = 'a2000000-0000-4000-8000-000000000001'
  ),
  true,
  'the participant details view reports manual payment as paid'
);

select is(
  public.set_game_participant_manual_paid(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    false
  ),
  'marked-unpaid',
  'admins can remove a manual payment mark'
);

select ok(
  (
    select manual_paid_at is null and manual_paid_by is null
    from public.game_payment_proofs
    where participant_id = 'a2000000-0000-4000-8000-000000000001'
  ),
  'unmarking clears the manual payment metadata'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    update public.game_payment_proofs
    set manual_paid_at = now()
    where participant_id = 'a2000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'permission denied for table game_payment_proofs',
  'players cannot directly update manual payment metadata'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.set_game_participant_manual_paid(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    true
  ),
  'marked-paid',
  'the participant can be marked paid again'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);

insert into storage.objects (bucket_id, name, metadata)
values (
  'payment-proofs',
  'a1000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000002/proof',
  '{"mimetype":"image/png","size":100}'
);

update public.game_payment_proofs
set
  proof_path = 'a1000000-0000-4000-8000-000000000001/a0000000-0000-4000-8000-000000000002/proof',
  proof_filename = 'proof.png',
  proof_mime_type = 'image/png',
  proof_uploaded_at = now()
where participant_id = 'a2000000-0000-4000-8000-000000000001';

select ok(
  (
    select manual_paid_at is null and manual_paid_by is null
    from public.game_payment_proofs
    where participant_id = 'a2000000-0000-4000-8000-000000000001'
  ),
  'proof finalization atomically clears the manual payment source'
);

select ok(
  (
    select payment_is_paid
    from public.game_participant_details
    where id = 'a2000000-0000-4000-8000-000000000001'
  ),
  'the participant remains paid through the uploaded proof'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.set_game_participant_manual_paid(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    true
  ),
  'proof-exists',
  'admins cannot mark a proof-paid participant manually'
);

select is(
  public.set_game_participant_manual_paid(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    false
  ),
  'proof-exists',
  'admins cannot unmark a proof-paid participant'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);

update public.game_payment_proofs
set
  proof_path = null,
  proof_filename = null,
  proof_mime_type = null,
  proof_deleted_at = now()
where participant_id = 'a2000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.set_game_participant_manual_paid(
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    true
  ),
  'proof-exists',
  'expired proofs remain authoritative payment evidence'
);

select is(
  (
    select payment_is_paid
    from public.game_participant_details
    where id = 'a2000000-0000-4000-8000-000000000001'
  ),
  true,
  'proof retention cleanup does not reverse paid status'
);

select * from finish();
rollback;
