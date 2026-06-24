alter table public.push_notification_outbox
drop constraint if exists push_notification_outbox_kind_check;

alter table public.push_notification_outbox
add constraint push_notification_outbox_kind_check
check (
  kind in (
    'payment_marked_paid',
    'waitlist_promoted',
    'game_reminder_4h',
    'game_cancelled',
    'game_deleted',
    'test'
  )
);

alter table public.push_notification_outbox
drop constraint if exists push_notification_outbox_game_event_id_fkey;

alter table public.push_notification_outbox
add constraint push_notification_outbox_game_event_id_fkey
foreign key (game_event_id)
references public.game_events(id)
on delete set null;

create or replace function private.delete_old_push_notification_outbox_entries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer := 0;
begin
  with deleted_entries as (
    delete from public.push_notification_outbox
    where created_at < now() - interval '14 days'
    returning 1
  )
  select count(*) into deleted_count
  from deleted_entries;

  return deleted_count;
end;
$$;

select cron.unschedule('delete-old-push-notifications')
where exists (
  select 1
  from cron.job
  where jobname = 'delete-old-push-notifications'
);

select cron.schedule(
  'delete-old-push-notifications',
  '15 3 * * *',
  $$select private.delete_old_push_notification_outbox_entries();$$
);
