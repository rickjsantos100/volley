alter table public.push_notification_outbox
drop constraint if exists push_notification_outbox_kind_check;

delete from public.push_notification_outbox
where kind = 'payment_marked_paid';

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
    'game_updated',
    'test'
  )
);

alter table public.push_notification_outbox
drop constraint if exists push_notification_outbox_status_check;

alter table public.push_notification_outbox
add constraint push_notification_outbox_status_check
check (status in ('pending', 'sent', 'failed', 'skipped'));

drop trigger if exists promote_waitlist_after_participant_delete
on public.game_participants;

create or replace function public.remove_game_participant(
  target_game_id uuid,
  target_participant_id uuid default null
)
returns table (
  removed_user_id uuid,
  promoted_participant_id uuid,
  promoted_user_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  participant_record record;
  promoted_entry record;
begin
  select id, user_id
  into participant_record
  from public.game_participants
  where game_event_id = target_game_id
    and (
      id = target_participant_id
      or (
        target_participant_id is null
        and user_id = (select auth.uid())
      )
    )
  for update;

  if not found then
    raise exception 'Participant not found.';
  end if;

  if
    participant_record.user_id <> (select auth.uid())
    and not private.is_admin()
  then
    raise exception 'Only admins can remove another participant.';
  end if;

  perform 1
  from public.game_events
  where id = target_game_id
    and status = 'scheduled'
    and starts_at >= now()
  for update;

  if not found then
    raise exception 'This game can no longer be changed.';
  end if;

  delete from public.game_participants
  where id = participant_record.id;

  removed_user_id := participant_record.user_id;
  promoted_participant_id := null;
  promoted_user_id := null;

  select id, user_id
  into promoted_entry
  from public.game_waitlist_entries
  where game_event_id = target_game_id
    and status = 'active'
  order by waitlist_order, joined_waitlist_at, id
  for update skip locked
  limit 1;

  if found then
    update public.game_waitlist_entries
    set status = 'promoted'
    where id = promoted_entry.id;

    insert into public.game_participants (
      game_event_id,
      user_id,
      added_by,
      source
    ) values (
      target_game_id,
      promoted_entry.user_id,
      (select auth.uid()),
      'waitlist_promoted'
    )
    returning id, user_id
    into promoted_participant_id, promoted_user_id;
  end if;

  return next;
end;
$$;

revoke delete on public.game_participants from authenticated;
revoke all on function public.remove_game_participant(uuid, uuid) from public;
grant execute on function public.remove_game_participant(uuid, uuid)
to authenticated;
