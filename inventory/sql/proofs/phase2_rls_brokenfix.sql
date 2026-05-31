-- =============================================================================
-- Inventory — Phase 2 proof (a), broken-vs-fixed (SQL editor / owner)
-- Run AFTER phase1.sql, in the Supabase SQL editor. Runs in ONE transaction and
-- ROLLS BACK -> no artifacts, least-privilege restored.
--
-- Demonstrates that the least-privilege items UPDATE policy (editor/admin only)
-- is what refuses a Viewer's edit at the DATABASE — not hidden UI:
--   FIXED  (real policy)         : Viewer UPDATE affects 0 rows  (refused)
--   BROKEN (add USING(true))     : Viewer UPDATE affects 1 row   (the breach)
--   ROLLBACK                     : permissive policy dropped, least-privilege back
--
-- Read the output in the "Messages"/NOTICES area. Expected:
--   NOTICE: FIXED  ... viewer UPDATE affected 0 row(s)  -> expect 0 = refused
--   NOTICE: BROKEN ... viewer UPDATE affected 1 row(s)  -> the breach least-privilege prevents
--
-- Uses the throwaway Viewer test user (test2@test.com). If you used a different
-- email, edit the two lookups below.
--
-- NOTE: relies on `set local role authenticated` + request.jwt.claims, the
-- standard Supabase RLS-as-a-role testing pattern. If your project restricts
-- `set role`, tell Claude and we'll adapt.
-- =============================================================================

begin;

-- Simulate the Viewer's session: auth.uid() -> the viewer; role -> authenticated
-- (so RLS is enforced; the owner would otherwise bypass it).
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  (select id::text from auth.users where lower(email) = lower('test2@test.com')),
    'role', 'authenticated'
  )::text,
  true   -- is_local: reset at transaction end
);
set local role authenticated;

-- ---- FIXED: least-privilege policy in force -> Viewer UPDATE must affect 0 rows
do $$
declare n int;
begin
  update public.items set notes = 'p2 brokenfix (fixed)' where id = (select min(id) from public.items);
  get diagnostics n = row_count;
  raise notice 'FIXED  (least-privilege items_update): viewer UPDATE affected % row(s)  -> expect 0 = refused', n;
end $$;

-- ---- BROKEN: add a permissive policy (the classic breach) -> Viewer UPDATE succeeds
reset role;  -- back to owner to do DDL
create policy _tmp_permissive_update on public.items
  for update to authenticated using (true) with check (true);

set local role authenticated;  -- re-enter the Viewer's session
do $$
declare n int;
begin
  update public.items set notes = 'p2 brokenfix (broken)' where id = (select min(id) from public.items);
  get diagnostics n = row_count;
  raise notice 'BROKEN (added USING(true) policy): viewer UPDATE affected % row(s)  -> 1 = the breach least-privilege prevents', n;
end $$;

reset role;
rollback;  -- drops _tmp_permissive_update + reverts the notes; least-privilege restored

-- Sanity after running this script: the permissive policy must NOT persist.
-- (Run separately; expect zero rows.)
--   select policyname from pg_policies
--   where schemaname='public' and tablename='items' and policyname='_tmp_permissive_update';
