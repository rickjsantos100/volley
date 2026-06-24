create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  expiration_time timestamptz,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create table public.push_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (
    kind in (
      'payment_marked_paid',
      'waitlist_promoted',
      'game_reminder_4h',
      'test'
    )
  ),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_event_id uuid references public.game_events(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'failed')
  ),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  dedupe_key text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index push_notification_outbox_dedupe_key_idx
on public.push_notification_outbox (dedupe_key);

create index push_subscriptions_user_id_idx
on public.push_subscriptions (user_id);

create index push_notification_outbox_pending_idx
on public.push_notification_outbox (status, created_at)
where status = 'pending';

create index push_notification_outbox_user_id_idx
on public.push_notification_outbox (user_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_notification_outbox enable row level security;

grant select, insert, update, delete
on public.push_subscriptions to authenticated;

grant all on public.push_subscriptions to service_role;
grant all on public.push_notification_outbox to service_role;

create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function private.set_updated_at();

create trigger set_push_notification_outbox_updated_at
before update on public.push_notification_outbox
for each row execute function private.set_updated_at();

create policy "Users can view their own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own push subscriptions"
on public.push_subscriptions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own push subscriptions"
on public.push_subscriptions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.promote_waitlist_after_participant_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  promoted_entry record;
begin
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
      'body', 'Saíste da lista de espera. Até já no campo.',
      'url', '/dashboard/games/' || old.game_event_id::text,
      'tag', 'waitlist-promoted-' || old.game_event_id::text
    ),
    'waitlist_promoted:' || old.game_event_id::text || ':' || promoted_entry.user_id::text
  )
  on conflict (dedupe_key) do nothing;

  return old;
end;
$$;
