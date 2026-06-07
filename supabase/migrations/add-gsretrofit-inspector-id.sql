-- Link DisptchMama inspectors to GS Retrofit's canonical numeric inspector ids.
--
-- DisptchMama keys inspectors by local UUID (jobs.assigned_to, the dispatch UI,
-- the scheduling engine). The GS Retrofit Dispatch API identifies inspectors by
-- a numeric id. This column is the translation used at schedule write-back time.
--
-- Nullable: null means "not yet linked to GS Retrofit" — the write-back action
-- blocks (with a clear error) rather than guessing for unlinked inspectors.
-- UNIQUE: two local inspectors cannot claim the same GS Retrofit id.
ALTER TABLE public.inspectors
  ADD COLUMN gsretrofit_inspector_id integer UNIQUE;
