create or replace function private.promote_waitlist_after_participant_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  promoted_entry record;
begin
  if current_setting('app.skip_waitlist_promotion', true) = 'on' then
    return old;
  end if;

  perform 1
  from public.game_events
  where id = old.game_event_id
    and status = 'scheduled'
    and starts_at >= now()
  for update;

  if not found then
    return old;
  end if;

  select *
  into promoted_entry
  from public.game_waitlist_entries
  where game_event_id = old.game_event_id
    and status = 'active'
  order by waitlist_order, joined_waitlist_at, id
  for update skip locked
  limit 1;

  if not found then
    return old;
  end if;

  update public.game_waitlist_entries
  set status = 'promoted'
  where id = promoted_entry.id;

  insert into public.game_participants (
    game_event_id,
    user_id,
    added_by,
    source
  ) values (
    old.game_event_id,
    promoted_entry.user_id,
    old.user_id,
    'waitlist_promoted'
  );

  insert into public.push_notification_outbox (
    kind,
    user_id,
    game_event_id,
    payload,
    dedupe_key
  ) values (
    'waitlist_promoted',
    promoted_entry.user_id,
    old.game_event_id,
    jsonb_build_object(
      'title', 'Tens vaga no jogo',
      'body', 'Saíste da lista de espera. Adiciona agora o comprovativo de pagamento.',
      'url', '/dashboard/games/' || old.game_event_id::text,
      'tag', 'waitlist-promoted-' || old.game_event_id::text
    ),
    'waitlist_promoted:' || old.game_event_id::text || ':' || promoted_entry.user_id::text
  )
  on conflict (dedupe_key) do nothing;

  return old;
end;
$$;

create trigger promote_waitlist_after_participant_delete
after delete on public.game_participants
for each row execute function private.promote_waitlist_after_participant_delete();

grant delete on public.game_participants to authenticated;

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

  perform set_config('app.skip_waitlist_promotion', 'on', true);
  delete from public.game_participants
  where id = participant_record.id;
  perform set_config('app.skip_waitlist_promotion', 'off', true);

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
