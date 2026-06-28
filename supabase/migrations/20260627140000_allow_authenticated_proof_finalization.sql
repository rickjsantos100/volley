grant insert (
  participant_id,
  game_event_id,
  user_id,
  proof_path,
  proof_filename,
  proof_mime_type,
  proof_uploaded_at
)
on public.game_payment_proofs
to authenticated;

grant update (
  proof_path,
  proof_filename,
  proof_mime_type,
  proof_uploaded_at
)
on public.game_payment_proofs
to authenticated;

create policy "Players can create their own payment proof metadata"
on public.game_payment_proofs
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.game_participants
    where game_participants.id = game_payment_proofs.participant_id
      and game_participants.game_event_id = game_payment_proofs.game_event_id
      and game_participants.user_id = (select auth.uid())
  )
);

create policy "Players can update their own payment proof metadata"
on public.game_payment_proofs
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.game_participants
    where game_participants.id = game_payment_proofs.participant_id
      and game_participants.game_event_id = game_payment_proofs.game_event_id
      and game_participants.user_id = (select auth.uid())
  )
);

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
  end if;

  return new;
end;
$$;

create trigger validate_payment_proof_metadata
before insert or update on public.game_payment_proofs
for each row execute function private.validate_payment_proof_metadata();
