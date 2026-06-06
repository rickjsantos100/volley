drop policy "Users can view their own profile" on public.profiles;
drop policy "Admins can view all profiles" on public.profiles;

create policy "Authenticated users can view allowed profiles"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or private.is_admin()
);
