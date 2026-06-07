-- Data step (run AFTER add-gsretrofit-inspector-id.sql).
-- Seeds the GS Retrofit inspector-id links derived from the name match preview
-- (2026-06-07). Idempotent-ish: links are set by exact local full_name.
--
-- NOTE on identity (per Morris):
--   * GS Retrofit #2 (Morley Tatro) is the software engineer, NOT an inspector.
--   * #21 / #27 / #28 ("AA Follow Up Needed", "An Outside Vendor",
--     "Cancelled_OnHold FollowUpComplete") are workflow buckets, NOT inspectors.
--   None of the above are added here.

-- 1. Add the 4 GS Retrofit inspectors not yet in DisptchMama (14 -> 18).
--    Regions inferred from their GS Retrofit zip coverage (all 91xxx = Valley).
insert into public.inspectors (full_name, region, gsretrofit_inspector_id) values
  ('Sirleaf Flomo',     'Valley', 77),
  ('Hunter Kelley',     'Valley', 94),
  ('Romarrio Richards', 'Valley', 95),  -- "Rob Mario"
  ('Corey Bishop',      'Valley', 96);

-- 2. Link the 14 existing local inspectors to their GS Retrofit numeric id.
update public.inspectors set gsretrofit_inspector_id = 43 where full_name = 'Ayat Salam';  -- GS Retrofit "Ayat Aziz" (same person)
update public.inspectors set gsretrofit_inspector_id = 13 where full_name = 'Charles';     -- Charles Luke
update public.inspectors set gsretrofit_inspector_id = 4  where full_name = 'Chrissy';      -- Chrissy Robbins
update public.inspectors set gsretrofit_inspector_id = 9  where full_name = 'Edgar';        -- Edgar Aldana
update public.inspectors set gsretrofit_inspector_id = 61 where full_name = 'Jason';        -- Jason Black
update public.inspectors set gsretrofit_inspector_id = 11 where full_name = 'Mario';        -- Mario Gomez
update public.inspectors set gsretrofit_inspector_id = 84 where full_name = 'Mark';         -- Mark Lasky
update public.inspectors set gsretrofit_inspector_id = 78 where full_name = 'Marvin';       -- Marvin Speller
update public.inspectors set gsretrofit_inspector_id = 7  where full_name = 'Michael';      -- Michael Galinsky
update public.inspectors set gsretrofit_inspector_id = 1  where full_name = 'Morris';       -- Morris Anderson
update public.inspectors set gsretrofit_inspector_id = 74 where full_name = 'Morris IV';    -- Morris IV Anderson
update public.inspectors set gsretrofit_inspector_id = 5  where full_name = 'Pete';         -- Peter Anderson
update public.inspectors set gsretrofit_inspector_id = 90 where full_name = 'Rico';         -- Rico Ellis
update public.inspectors set gsretrofit_inspector_id = 16 where full_name = 'Sal';          -- Sal Camarena
