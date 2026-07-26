alter table public.profiles
add column phone_country_code text,
add column phone_number text;

update public.profiles
set
  phone_country_code = '0',
  phone_number = '0';

alter table public.profiles
alter column phone_country_code set not null,
alter column phone_number set not null;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    display_name,
    phone_country_code,
    phone_number,
    role
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      nullif(
        concat_ws(
          ' ',
          new.raw_user_meta_data ->> 'first_name',
          new.raw_user_meta_data ->> 'last_name'
        ),
        ''
      )
    ),
    coalesce(new.raw_user_meta_data ->> 'phone_country_code', '0'),
    coalesce(new.raw_user_meta_data ->> 'phone_number', '0'),
    'user'
  );

  return new;
end;
$$;

grant update (phone_country_code, phone_number)
on public.profiles
to authenticated;
