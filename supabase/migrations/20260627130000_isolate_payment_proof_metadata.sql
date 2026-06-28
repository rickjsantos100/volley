create table public.game_payment_proofs (
  participant_id uuid primary key
    references public.game_participants(id) on delete cascade,
  game_event_id uuid not null
    references public.game_events(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  proof_path text,
  proof_filename text,
  proof_mime_type text,
  proof_uploaded_at timestamptz,
  proof_requested_at timestamptz,
  proof_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_payment_proofs_unique_player
    unique (game_event_id, user_id),
  constraint game_payment_proofs_metadata_check
  check (
    (
      proof_path is null
      and proof_filename is null
      and proof_mime_type is null
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
  )
);

insert into public.game_payment_proofs (
  participant_id,
  game_event_id,
  user_id,
  proof_path,
  proof_filename,
  proof_mime_type,
  proof_uploaded_at,
  proof_requested_at,
  proof_deleted_at
)
select
  id,
  game_event_id,
  user_id,
  payment_proof_path,
  payment_proof_filename,
  payment_proof_mime_type,
  payment_proof_uploaded_at,
  payment_proof_requested_at,
  payment_proof_deleted_at
from public.game_participants
where
  payment_proof_path is not null
  or payment_proof_requested_at is not null
  or payment_proof_deleted_at is not null;

create index game_payment_proofs_game_event_id_idx
on public.game_payment_proofs (game_event_id);

create index game_payment_proofs_user_id_idx
on public.game_payment_proofs (user_id);

alter table public.game_payment_proofs enable row level security;

grant select on public.game_payment_proofs to authenticated;
grant all on public.game_payment_proofs to service_role;

create trigger set_game_payment_proofs_updated_at
before update on public.game_payment_proofs
for each row execute function private.set_updated_at();

create policy "Players can view their own payment proof metadata"
on public.game_payment_proofs
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Admins can view all payment proof metadata"
on public.game_payment_proofs
for select
to authenticated
using ((select private.is_admin()));

drop view public.game_participant_details;

alter table public.game_participants
drop column payment_proof_path,
drop column payment_proof_filename,
drop column payment_proof_mime_type,
drop column payment_proof_uploaded_at,
drop column payment_proof_requested_at,
drop column payment_proof_deleted_at;

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
  profiles.display_name,
  profiles.first_name,
  profiles.last_name,
  profiles.email
from public.game_participants
join public.game_events
  on game_events.id = game_participants.game_event_id
join public.profiles
  on profiles.id = game_participants.user_id
left join public.game_payment_proofs
  on game_payment_proofs.participant_id = game_participants.id
where
  private.is_admin()
  or (
    game_events.status in ('scheduled', 'cancelled')
    and game_events.starts_at >= now()
  );

grant select on public.game_participant_details to authenticated;
