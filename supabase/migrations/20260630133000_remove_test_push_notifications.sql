alter table public.push_notification_outbox
drop constraint if exists push_notification_outbox_kind_check;

delete from public.push_notification_outbox
where kind = 'test';

alter table public.push_notification_outbox
add constraint push_notification_outbox_kind_check
check (
  kind in (
    'admin_added_to_game',
    'payment_proof_requested',
    'waitlist_promoted',
    'game_reminder_4h',
    'game_cancelled',
    'game_deleted',
    'game_uncancelled',
    'game_updated'
  )
);
