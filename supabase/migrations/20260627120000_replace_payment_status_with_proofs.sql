truncate table
  public.game_waitlist_entries,
  public.game_participants;

drop view if exists public.game_participant_details;

drop policy if exists "Admins can update participant payment status"
on public.game_participants;

alter table public.game_participants
drop column payment_status,
drop column payment_updated_by,
drop column payment_updated_at,
add column payment_proof_path text,
add column payment_proof_filename text,
add column payment_proof_mime_type text,
add column payment_proof_uploaded_at timestamptz,
add column payment_proof_requested_at timestamptz,
add column payment_proof_deleted_at timestamptz,
add constraint game_participants_payment_proof_metadata_check
check (
  (
    payment_proof_path is null
    and payment_proof_filename is null
    and payment_proof_mime_type is null
  )
  or (
    payment_proof_path is not null
    and payment_proof_filename is not null
    and payment_proof_mime_type in (
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    )
    and payment_proof_uploaded_at is not null
    and payment_proof_deleted_at is null
  )
);

drop type public.game_payment_status;

grant select (
  payment_proof_path,
  payment_proof_filename,
  payment_proof_mime_type,
  payment_proof_uploaded_at,
  payment_proof_requested_at,
  payment_proof_deleted_at
)
on public.game_participants
to authenticated;

create or replace view public.game_participant_details
with (security_invoker = true)
as
select
  game_participants.id,
  game_participants.game_event_id,
  game_participants.user_id,
  game_participants.joined_at,
  game_participants.source,
  case
    when private.is_admin() or game_participants.user_id = (select auth.uid())
      then game_participants.payment_proof_path
    else null
  end as payment_proof_path,
  case
    when private.is_admin() or game_participants.user_id = (select auth.uid())
      then game_participants.payment_proof_filename
    else null
  end as payment_proof_filename,
  case
    when private.is_admin() or game_participants.user_id = (select auth.uid())
      then game_participants.payment_proof_mime_type
    else null
  end as payment_proof_mime_type,
  case
    when private.is_admin() or game_participants.user_id = (select auth.uid())
      then game_participants.payment_proof_uploaded_at
    else null
  end as payment_proof_uploaded_at,
  case
    when private.is_admin() or game_participants.user_id = (select auth.uid())
      then game_participants.payment_proof_requested_at
    else null
  end as payment_proof_requested_at,
  case
    when private.is_admin() or game_participants.user_id = (select auth.uid())
      then game_participants.payment_proof_deleted_at
    else null
  end as payment_proof_deleted_at,
  profiles.display_name,
  profiles.first_name,
  profiles.last_name,
  profiles.email
from public.game_participants
join public.game_events
  on game_events.id = game_participants.game_event_id
join public.profiles
  on profiles.id = game_participants.user_id
where
  private.is_admin()
  or (
    game_events.status in ('scheduled', 'cancelled')
    and game_events.starts_at >= now()
  );

grant select on public.game_participant_details to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Players can upload their own payment proof"
on storage.objects;
drop policy if exists "Players can replace their own payment proof"
on storage.objects;
drop policy if exists "Players can view their own payment proof"
on storage.objects;
drop policy if exists "Players can delete their own payment proof"
on storage.objects;
drop policy if exists "Admins can view payment proofs"
on storage.objects;

create policy "Players can upload their own payment proof"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and storage.filename(name) = 'proof'
  and exists (
    select 1
    from public.game_participants
    where game_participants.game_event_id::text = (storage.foldername(name))[1]
      and game_participants.user_id = (select auth.uid())
  )
);

create policy "Players can replace their own payment proof"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and storage.filename(name) = 'proof'
)
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and storage.filename(name) = 'proof'
  and exists (
    select 1
    from public.game_participants
    where game_participants.game_event_id::text = (storage.foldername(name))[1]
      and game_participants.user_id = (select auth.uid())
  )
);

create policy "Players can view their own payment proof"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and storage.filename(name) = 'proof'
);

create policy "Players can delete their own payment proof"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and storage.filename(name) = 'proof'
);

create policy "Admins can view payment proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (select private.is_admin())
);

alter table public.push_notification_outbox
drop constraint if exists push_notification_outbox_kind_check;

alter table public.push_notification_outbox
add constraint push_notification_outbox_kind_check
check (
  kind in (
    'payment_marked_paid',
    'payment_proof_requested',
    'waitlist_promoted',
    'game_reminder_4h',
    'game_cancelled',
    'game_deleted',
    'test'
  )
);

create or replace function private.invoke_payment_proof_cleanup()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into app_url
  from vault.decrypted_secrets
  where name = 'notification_reminder_app_url';

  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'notification_reminder_cron_secret';

  if app_url is null or cron_secret is null then
    raise exception 'Missing application URL or cron secret in Vault.';
  end if;

  select net.http_post(
    url := rtrim(app_url, '/') || '/api/payment-proofs/cleanup',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || cron_secret,
      'Content-Type',
      'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  )
  into request_id;

  return request_id;
end;
$$;

select cron.unschedule('delete-expired-payment-proofs')
where exists (
  select 1
  from cron.job
  where jobname = 'delete-expired-payment-proofs'
);

select cron.schedule(
  'delete-expired-payment-proofs',
  '0 4 * * *',
  $$select private.invoke_payment_proof_cleanup();$$
);
