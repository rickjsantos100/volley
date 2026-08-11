alter table public.game_payment_proofs
add column manual_paid_at timestamptz,
add column manual_paid_by uuid
  references auth.users(id) on delete set null;

alter table public.game_payment_proofs
drop constraint game_payment_proofs_metadata_check;

alter table public.game_payment_proofs
add constraint game_payment_proofs_metadata_check
check (
  (
    proof_path is null
    and proof_filename is null
    and proof_mime_type is null
    and (
      proof_uploaded_at is null
      or proof_deleted_at is not null
    )
  )
  or (
    proof_path is not null
    and proof_filename is not null
    and proof_mime_type in (
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    )
    and proof_uploaded_at is not null
    and proof_deleted_at is null
  )
),
add constraint game_payment_proofs_manual_actor_check
check (
  manual_paid_at is not null
  or manual_paid_by is null
),
add constraint game_payment_proofs_payment_source_check
check (
  proof_uploaded_at is null
  or manual_paid_at is null
);

revoke insert (manual_paid_at, manual_paid_by)
on public.game_payment_proofs
from anon, authenticated;

revoke update (manual_paid_at, manual_paid_by)
on public.game_payment_proofs
from anon, authenticated;

create or replace function private.validate_payment_proof_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_path text;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role'
    and new.user_id <> (select auth.uid())
    and not private.is_admin()
  then
    raise exception 'Payment proof metadata can only be changed by its owner.';
  end if;

  if not exists (
    select 1
    from public.game_participants
    where game_participants.id = new.participant_id
      and game_participants.game_event_id = new.game_event_id
      and game_participants.user_id = new.user_id
  ) then
    raise exception 'Payment proof does not match a game participant.';
  end if;

  if new.proof_path is not null then
    expected_path :=
      new.game_event_id::text || '/' || new.user_id::text || '/proof';

    if new.proof_path <> expected_path then
      raise exception 'Invalid payment proof storage path.';
    end if;

    if not exists (
      select 1
      from storage.objects
      where storage.objects.bucket_id = 'payment-proofs'
        and storage.objects.name = expected_path
        and storage.objects.metadata ->> 'mimetype' = new.proof_mime_type
        and coalesce(
          (storage.objects.metadata ->> 'size')::bigint,
          5242881
        ) <= 5242880
    ) then
      raise exception 'Payment proof file is missing or invalid.';
    end if;

    new.proof_uploaded_at := now();
    new.proof_deleted_at := null;
    new.manual_paid_at := null;
    new.manual_paid_by := null;
  end if;

  return new;
end;
$$;

create or replace function private.set_game_participant_manual_paid(
  target_game_id uuid,
  target_participant_id uuid,
  paid boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  participant_record record;
  payment_record record;
begin
  if not private.is_admin() then
    raise exception 'Only admins can change manual payment state.';
  end if;

  if paid is null then
    raise exception 'Paid must be true or false.';
  end if;

  select
    game_participants.game_event_id,
    game_participants.user_id
  into participant_record
  from public.game_participants
  join public.game_events
    on game_events.id = game_participants.game_event_id
  where game_participants.id = target_participant_id
    and game_participants.game_event_id = target_game_id
    and game_events.status = 'scheduled'
  for update of game_participants, game_events;

  if not found then
    raise exception 'Participant is not available for payment changes.';
  end if;

  select
    game_payment_proofs.proof_uploaded_at,
    game_payment_proofs.manual_paid_at
  into payment_record
  from public.game_payment_proofs
  where game_payment_proofs.participant_id = target_participant_id
  for update;

  if not found and not paid then
    return 'marked-unpaid';
  end if;

  if not found then
    insert into public.game_payment_proofs (
      participant_id,
      game_event_id,
      user_id
    ) values (
      target_participant_id,
      participant_record.game_event_id,
      participant_record.user_id
    )
    on conflict (participant_id) do nothing;

    select
      game_payment_proofs.proof_uploaded_at,
      game_payment_proofs.manual_paid_at
    into payment_record
    from public.game_payment_proofs
    where game_payment_proofs.participant_id = target_participant_id
    for update;
  end if;

  if payment_record.proof_uploaded_at is not null then
    return 'proof-exists';
  end if;

  if paid and payment_record.manual_paid_at is null then
    update public.game_payment_proofs
    set
      manual_paid_at = now(),
      manual_paid_by = (select auth.uid())
    where participant_id = target_participant_id;
  elsif not paid and payment_record.manual_paid_at is not null then
    update public.game_payment_proofs
    set
      manual_paid_at = null,
      manual_paid_by = null
    where participant_id = target_participant_id;
  end if;

  if paid then
    return 'marked-paid';
  end if;

  return 'marked-unpaid';
end;
$$;

revoke all
on function private.set_game_participant_manual_paid(uuid, uuid, boolean)
from public;

grant execute
on function private.set_game_participant_manual_paid(uuid, uuid, boolean)
to authenticated;

create or replace function public.set_game_participant_manual_paid(
  target_game_id uuid,
  target_participant_id uuid,
  paid boolean
)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.set_game_participant_manual_paid(
    target_game_id,
    target_participant_id,
    paid
  );
$$;

revoke all
on function public.set_game_participant_manual_paid(uuid, uuid, boolean)
from public;

grant execute
on function public.set_game_participant_manual_paid(uuid, uuid, boolean)
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
  game_payment_proofs.proof_path as payment_proof_path,
  game_payment_proofs.proof_filename as payment_proof_filename,
  game_payment_proofs.proof_mime_type as payment_proof_mime_type,
  game_payment_proofs.proof_uploaded_at as payment_proof_uploaded_at,
  game_payment_proofs.proof_requested_at as payment_proof_requested_at,
  game_payment_proofs.proof_deleted_at as payment_proof_deleted_at,
  game_roster_profiles.display_name,
  game_roster_profiles.first_name,
  game_roster_profiles.last_name,
  game_roster_profiles.avatar_path,
  game_roster_profiles.avatar_updated_at,
  (
    game_payment_proofs.proof_uploaded_at is not null
    or game_payment_proofs.manual_paid_at is not null
  ) as payment_is_paid,
  game_payment_proofs.manual_paid_at
from public.game_participants
join public.game_events
  on game_events.id = game_participants.game_event_id
join public.game_roster_profiles
  on game_roster_profiles.game_event_id = game_participants.game_event_id
  and game_roster_profiles.user_id = game_participants.user_id
left join public.game_payment_proofs
  on game_payment_proofs.participant_id = game_participants.id
where
  private.is_admin()
  or (
    game_events.status in ('scheduled', 'cancelled')
    and game_events.starts_at >= now()
  );

revoke all on public.game_participant_details from anon;
grant select on public.game_participant_details to authenticated;
