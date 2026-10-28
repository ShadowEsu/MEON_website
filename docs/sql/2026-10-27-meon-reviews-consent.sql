-- MEON guest reviews: store the consent the guest ticked (ledger 299).
-- Project jaymini-prod (wzgfjuxcprignwdlopvl), table public.meon_reviews. Run in the Supabase SQL editor.
-- Needs Security's GO and BOSS's approval first: it changes a production database shared with Jaymini.
--
-- Order (expand, deploy, then enforce):
--   STEP 1  before the site deploy. Adds a nullable column, so the live form keeps working.
--   STEP 2  deploy the site build that sends consent_version (branch audit-top5).
--   STEP 3  after the deploy is live and one test review posts. Rejects any new review without consent.
-- Older rows keep consent_version = null: they were posted before the checkbox existed.

-- STEP 1 ---------------------------------------------------------------------------------------
set lock_timeout = '5s';
set statement_timeout = '30s';
alter table public.meon_reviews add column if not exists consent_version text;
-- The public key may only insert listed columns if column grants are in use; this is a no-op otherwise.
grant insert (consent_version) on public.meon_reviews to anon;
notify pgrst, 'reload schema';

-- STEP 3 ---------------------------------------------------------------------------------------
-- set lock_timeout = '5s';
-- alter table public.meon_reviews
--   add constraint meon_reviews_consent_required
--   check (consent_version ~ '^reviews-[0-9]{4}-[0-9]{2}-[0-9]{2}$') not valid;
--
-- Check (should fail with a check violation, so nothing is inserted; if it succeeds, the constraint
-- is missing: delete that "Test" row in the Table Editor and re-run STEP 3):
--   curl -s -X POST "$SUPABASE_URL/rest/v1/meon_reviews" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
--     -H "Content-Type: application/json" -d '{"name":"Test","rating":5,"comment":"consent check","source":"web"}'
--
-- Rollback: alter table public.meon_reviews drop constraint if exists meon_reviews_consent_required;
--           (the column itself can stay; it is harmless when unused)
