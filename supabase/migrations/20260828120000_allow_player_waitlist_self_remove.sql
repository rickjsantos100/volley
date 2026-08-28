-- Authenticated players can remove their own active waitlist entries for
-- scheduled games. Admin deletion behavior for scheduled games is preserved,
-- including the ability to remove non-active (e.g. promoted/cancelled) entries.
--
-- Cancelled games remain locked: neither players nor admins can delete
-- waitlist entries for cancelled games through this policy, matching the
-- existing scheduled-game gate from 20260630120000_lock_cancelled_game_admin_interactions.sql.

drop policy "Admins can delete scheduled game waitlist entries"
on public.game_waitlist_entries;

create policy "Authenticated users can delete their own scheduled game waitlist entries"
on public.game_waitlist_entries
for delete
to authenticated
using (
  (
    (
      user_id = (select auth.uid())
      and status = 'active'
    )
    or (select private.is_admin())
  )
  and exists (
    select 1
    from public.game_events
    where game_events.id = game_waitlist_entries.game_event_id
      and game_events.status = 'scheduled'
  )
);
