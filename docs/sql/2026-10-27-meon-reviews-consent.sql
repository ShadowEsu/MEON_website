-- MEON guest reviews: store the consent the guest ticked (ledger 299).
-- Project jaymini-prod (wzgfjuxcprignwdlopvl), table public.meon_reviews. Run in the Supabase SQL editor.
-- Needs Security's GO and BOSS's approval first: it changes a production database shared with Jaymini.
--
-- Order (expand, deploy, then enforce):
--   STEP 1  before the site deploy. Adds a nullable column, so the live form keeps working.
--   STEP 2  deploy the site build that sends consent_version (branch audit-top5).
--   STEP 3  after the deploy is live and the probe below passes. Rejects any new review without consent.
-- Older rows keep consent_version = null: they were posted before the checkbox existed.

-- STEP 1 ---------------------------------------------------------------------------------------
set lock_timeout = '5s';
set statement_timeout = '30s';
alter table public.meon_reviews add column if not exists consent_version text;
-- anon and authenticated insert through column grants (name, rating, comment, noodle_slug, source; read from
-- pg_attribute.attacl on 2026-10-27), so the new column needs the same grant or every new review fails with 42501.
grant insert (consent_version) on public.meon_reviews to anon, authenticated;
notify pgrst, 'reload schema';
-- Probe (inserts nothing): POST a review with consent_version and rating 9 using the publishable key.
--   PGRST204 "Could not find the 'consent_version' column"  -> column missing
--   42501 permission denied                                  -> grant missing
--   23514 meon_reviews_rating_check                          -> column and grant OK (rating check is 1-5)
--
-- STEP 1 rollback (additive only, nothing else changes):
--   revoke insert (consent_version) on public.meon_reviews from anon, authenticated;
--   alter table public.meon_reviews drop column if exists consent_version;
--   notify pgrst, 'reload schema';
--   Roll the site back first: the new form sends consent_version, which fails once the column is gone.

-- STEP 3 ---------------------------------------------------------------------------------------
-- set lock_timeout = '5s';
-- set statement_timeout = '30s';
-- alter table public.meon_reviews
--   add constraint meon_reviews_consent_required
--   check (
--     (consent_version is not null and consent_version ~ '^reviews-[0-9]{4}-[0-9]{2}-[0-9]{2}$')
--     or created_at < timestamptz 'CUTOFF'
--   ) not valid;
--
-- * A CHECK passes when its expression is NULL, so "is not null" is what rejects a review sent without
--   consent_version.
-- * NOT VALID only skips checking old rows when the constraint is added. Postgres still checks every
--   UPDATE, so without the created_at clause, unticking `approved` to hide an old review would fail.
--   Rows created before CUTOFF predate the checkbox; anon can't set created_at (no column grant; default
--   now()), so a new review can't use that clause.
-- * CUTOFF = the UTC time read with `select now()` immediately before running STEP 3, written as a literal
--   (e.g. '2026-10-28 21:05:00+00'). Security sees the final statement before it runs.
--
-- Probe (inserts nothing): POST without consent_version and with rating 9. Postgres checks constraints in
-- name order, so the error names meon_reviews_consent_required when STEP 3 is in place, and
-- meon_reviews_rating_check when it isn't:
--   curl -s -X POST "$SUPABASE_URL/rest/v1/meon_reviews" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
--     -H "Content-Type: application/json" -d '{"name":"Probe","rating":9,"comment":"consent probe","source":"web"}'
--
-- Rollback: alter table public.meon_reviews drop constraint if exists meon_reviews_consent_required;
--           (the column itself can stay; it is harmless when unused)
--
-- Moderation check after STEP 3 (inside a transaction that is rolled back, so nothing changes):
--   begin; update public.meon_reviews set approved = approved where consent_version is null; rollback;
--   It must succeed. If it fails with meon_reviews_consent_required, drop the constraint and fix CUTOFF.
