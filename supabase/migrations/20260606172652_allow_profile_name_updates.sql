grant update (first_name, last_name, display_name)
on public.profiles
to authenticated;

create policy "Users can update their own profile names"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
