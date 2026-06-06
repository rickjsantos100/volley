alter table public.profiles
add column first_name text,
add column last_name text;

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
    'user'
  );

  return new;
end;
$$;
