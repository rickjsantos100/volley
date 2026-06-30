drop trigger if exists promote_waitlist_after_participant_delete
on public.game_participants;

revoke delete on public.game_participants from authenticated;
