grant delete on public.game_waitlist_entries to authenticated;

create policy "Admins can delete waitlist entries"
on public.game_waitlist_entries
for delete
to authenticated
using ((select private.is_admin()));
