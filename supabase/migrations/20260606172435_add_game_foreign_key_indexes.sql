create index game_events_created_by_idx
on public.game_events (created_by);

create index game_participants_added_by_idx
on public.game_participants (added_by);

create index game_participants_payment_updated_by_idx
on public.game_participants (payment_updated_by);
