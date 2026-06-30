alter table public.profiles
add column email_notifications_enabled boolean not null default true;