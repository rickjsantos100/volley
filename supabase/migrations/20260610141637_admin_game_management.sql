grant insert (
  title,
  starts_at,
  duration_minutes,
  max_participants,
  is_repeatable,
  repeat_frequency,
  repeat_ends_at,
  status,
  created_by
)
on public.game_events to authenticated;

grant update (status)
on public.game_events to authenticated;

grant delete
on public.game_events to authenticated;

drop policy "Authenticated users can view upcoming scheduled games"
on public.game_events;

create policy "Authenticated users can view upcoming visible games"
on public.game_events
for select
to authenticated
using (
  (
    status in ('scheduled', 'cancelled')
    and starts_at >= now()
  )
  or (select private.is_admin())
);

create policy "Admins can create scheduled games"
on public.game_events
for insert
to authenticated
with check (
  (select private.is_admin())
  and status = 'scheduled'
  and created_by = (select auth.uid())
);

create policy "Admins can update game status"
on public.game_events
for update
to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and status in ('scheduled', 'cancelled', 'completed')
);

create policy "Admins can delete games"
on public.game_events
for delete
to authenticated
using ((select private.is_admin()));

drop policy "Authenticated users can count visible game participants"
on public.game_participants;

create policy "Authenticated users can count visible game participants"
on public.game_participants
for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.game_events
    where game_events.id = game_participants.game_event_id
      and game_events.status in ('scheduled', 'cancelled')
      and game_events.starts_at >= now()
  )
);

drop policy "Authenticated users can view visible waitlists"
on public.game_waitlist_entries;

create policy "Authenticated users can view visible waitlists"
on public.game_waitlist_entries
for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.game_events
    where game_events.id = game_waitlist_entries.game_event_id
      and game_events.status in ('scheduled', 'cancelled')
      and game_events.starts_at >= now()
  )
);

create index if not exists game_events_upcoming_visible_idx
on public.game_events (starts_at)
where status in ('scheduled', 'cancelled');

create or replace view public.game_participant_details as
select
  game_participants.id,
  game_participants.game_event_id,
  game_participants.user_id,
  game_participants.joined_at,
  game_participants.source,
  case
    when private.is_admin() or game_participants.user_id = (select auth.uid())
      then game_participants.payment_status
    else null
  end as payment_status,
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

create or replace view public.game_waitlist_details as
select
  game_waitlist_entries.id,
  game_waitlist_entries.game_event_id,
  game_waitlist_entries.user_id,
  game_waitlist_entries.joined_waitlist_at,
  game_waitlist_entries.status,
  row_number() over (
    partition by game_waitlist_entries.game_event_id
    order by game_waitlist_entries.joined_waitlist_at, game_waitlist_entries.id
  ) as position,
  profiles.display_name,
  profiles.first_name,
  profiles.last_name,
  profiles.email
from public.game_waitlist_entries
join public.game_events
  on game_events.id = game_waitlist_entries.game_event_id
join public.profiles
  on profiles.id = game_waitlist_entries.user_id
where
  game_waitlist_entries.status = 'active'
  and (
    private.is_admin()
    or (
      game_events.status in ('scheduled', 'cancelled')
      and game_events.starts_at >= now()
    )
  );
