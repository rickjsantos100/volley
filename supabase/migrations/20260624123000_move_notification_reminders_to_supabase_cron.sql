create extension if not exists pg_net with schema extensions;

create or replace function private.invoke_notification_reminders()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into app_url
  from vault.decrypted_secrets
  where name = 'notification_reminder_app_url';

  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'notification_reminder_cron_secret';

  if app_url is null or cron_secret is null then
    raise exception 'Missing notification reminder Vault secrets.';
  end if;

  select net.http_get(
    url := rtrim(app_url, '/') || '/api/notifications/reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || cron_secret
    ),
    timeout_milliseconds := 5000
  )
  into request_id;

  return request_id;
end;
$$;

select cron.unschedule('send-game-reminder-notifications')
where exists (
  select 1
  from cron.job
  where jobname = 'send-game-reminder-notifications'
);

select cron.schedule(
  'send-game-reminder-notifications',
  '*/15 * * * *',
  $$select private.invoke_notification_reminders();$$
);
