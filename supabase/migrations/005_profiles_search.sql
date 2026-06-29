-- Phase 5 fix: allow any authenticated user to read profiles
-- Required for friend search — the old policy blocked cross-user lookups.

drop policy if exists "profiles_select" on public.profiles;

-- Any signed-in user can read display_name / difficulty (not sensitive).
-- Own-row write policies are unchanged.
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);
