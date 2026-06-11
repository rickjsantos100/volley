drop policy "Admins can update game status"
on public.game_events;

create policy "Admins can update game status"
on public.game_events
for update
to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and status in ('scheduled', 'cancelled', 'completed', 'deleted')
);

create or replace function private.delete_expired_game_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer := 0;
begin
  with deleted_events as (
    delete from public.game_events
    where starts_at + (duration_minutes * interval '1 minute') < now() - interval '4 months'
    returning 1
  )
  select count(*) into deleted_count
  from deleted_events;

  return deleted_count;
end;
$$;

select cron.unschedule('delete-expired-game-events')
where exists (
  select 1
  from cron.job
  where jobname = 'delete-expired-game-events'
);

select cron.schedule(
  'delete-expired-game-events',
  '30 3 * * *',
  $$select private.delete_expired_game_events();$$
);
