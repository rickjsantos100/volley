alter view public.game_participant_details
set (security_invoker = true);

alter view public.game_waitlist_details
set (security_invoker = true);

create index recurring_game_series_created_by_idx
on public.recurring_game_series (created_by);

create index recurring_game_exceptions_created_by_idx
on public.recurring_game_exceptions (created_by);
