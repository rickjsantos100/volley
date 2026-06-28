drop view public.game_participant_details;
drop view public.game_waitlist_details;

-- This view intentionally uses the view owner's privileges to expose only the
-- profile fields that are safe to show on visible game rosters. The explicit
-- game visibility predicate prevents it from becoming a general profile list.
create view public.game_roster_profiles
with (security_barrier = true)
as
with roster_memberships as (
  select
    game_participants.game_event_id,
    game_participants.user_id
  from public.game_participants

  union

  select
    game_waitlist_entries.game_event_id,
    game_waitlist_entries.user_id
  from public.game_waitlist_entries
  where game_waitlist_entries.status = 'active'
)
select
  roster_memberships.game_event_id,
  profiles.id as user_id,
  profiles.display_name,
  profiles.first_name,
  profiles.last_name,
  profiles.avatar_path,
  profiles.avatar_updated_at
from roster_memberships
join public.game_events
  on game_events.id = roster_memberships.game_event_id
join public.profiles
  on profiles.id = roster_memberships.user_id
where
  private.is_admin()
  or (
    game_events.status in ('scheduled', 'cancelled')
    and game_events.starts_at >= now()
  );

revoke all on public.game_roster_profiles from anon, authenticated;
grant select on public.game_roster_profiles to authenticated;

create view public.game_participant_details
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
  game_roster_profiles.avatar_updated_at
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

grant select on public.game_participant_details to authenticated;

create view public.game_waitlist_details
with (security_invoker = true)
as
select
  game_waitlist_entries.id,
  game_waitlist_entries.game_event_id,
  game_waitlist_entries.user_id,
  game_waitlist_entries.joined_waitlist_at,
  game_waitlist_entries.status,
  row_number() over (
    partition by game_waitlist_entries.game_event_id
    order by
      game_waitlist_entries.waitlist_order,
      game_waitlist_entries.joined_waitlist_at,
      game_waitlist_entries.id
  ) as position,
  game_roster_profiles.display_name,
  game_roster_profiles.first_name,
  game_roster_profiles.last_name,
  game_roster_profiles.avatar_path,
  game_roster_profiles.avatar_updated_at
from public.game_waitlist_entries
join public.game_events
  on game_events.id = game_waitlist_entries.game_event_id
join public.game_roster_profiles
  on game_roster_profiles.game_event_id = game_waitlist_entries.game_event_id
  and game_roster_profiles.user_id = game_waitlist_entries.user_id
where
  game_waitlist_entries.status = 'active'
  and (
    private.is_admin()
    or (
      game_events.status in ('scheduled', 'cancelled')
      and game_events.starts_at >= now()
    )
  );

grant select on public.game_waitlist_details to authenticated;
