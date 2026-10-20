-- Serialize the capacity decision with the existing insertion guards.
create function private.admin_add_game_player(target_game_id uuid, target_user_id uuid)
returns table (destination text, participant_id uuid, waitlist_entry_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  capacity integer;
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception 'Only admins can add players.';
  end if;

  select g.max_participants into capacity
  from public.game_events g
  where g.id = target_game_id and g.status = 'scheduled' and g.starts_at > now()
  for update;
  if not found then
    raise exception 'This game is not available to join.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = target_user_id) then
    raise exception 'Player not found.';
  end if;
  if exists (select 1 from public.game_participants p
             where p.game_event_id = target_game_id and p.user_id = target_user_id)
     or exists (select 1 from public.game_waitlist_entries w
                where w.game_event_id = target_game_id and w.user_id = target_user_id
                  and w.status = 'active') then
    raise exception 'Player is already in this game or on its waitlist.';
  end if;

  if (select count(*) from public.game_participants p where p.game_event_id = target_game_id) < capacity then
    insert into public.game_participants (game_event_id, user_id, added_by, source)
    values (target_game_id, target_user_id, (select auth.uid()), 'admin_added')
    returning id into participant_id;
    -- The legacy insert guard labels an admin adding themselves self_joined.
    -- This RPC is explicitly an admin operation, including that case.
    update public.game_participants p set source = 'admin_added'
    where p.id = participant_id and p.source <> 'admin_added';
    destination := 'participant';
  else
    -- The existing guard assigns max(active waitlist_order) + 1 under this lock.
    insert into public.game_waitlist_entries (game_event_id, user_id)
    values (target_game_id, target_user_id)
    returning id into waitlist_entry_id;
    destination := 'waitlist';
  end if;
  return next;
end;
$$;

revoke all on function private.admin_add_game_player(uuid, uuid) from public, anon, authenticated;
grant execute on function private.admin_add_game_player(uuid, uuid) to authenticated;

create function public.admin_add_game_player(target_game_id uuid, target_user_id uuid)
returns table (destination text, participant_id uuid, waitlist_entry_id uuid)
language sql
security invoker
set search_path = ''
as $$
  select * from private.admin_add_game_player(target_game_id, target_user_id);
$$;
revoke all on function public.admin_add_game_player(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_add_game_player(uuid, uuid) to authenticated;

alter table public.push_notification_outbox drop constraint push_notification_outbox_kind_check;
alter table public.push_notification_outbox add constraint push_notification_outbox_kind_check
check (kind in (
  'admin_added_to_game', 'admin_added_to_waitlist', 'payment_proof_requested',
  'waitlist_promoted', 'game_reminder_4h', 'game_cancelled', 'game_deleted',
  'game_uncancelled', 'game_updated'
));
