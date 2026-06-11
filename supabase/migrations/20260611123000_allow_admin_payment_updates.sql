grant update (payment_status, payment_updated_by, payment_updated_at)
on public.game_participants to authenticated;

create policy "Admins can update participant payment status"
on public.game_participants
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
