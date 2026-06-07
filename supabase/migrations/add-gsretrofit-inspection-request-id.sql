-- Link DisptchMama jobs to GS Retrofit's inspection-request id.
--
-- The schedule write-back targets POST /inspection-requests/{id}/schedule, where
-- {id} is GS Retrofit's numeric inspection-request id. Local jobs need to carry
-- that id so we know where to write back.
--
-- Nullable: null means "this job did not originate from GS Retrofit" (e.g. a
-- manually-created job) — the write-back action blocks for such jobs rather than
-- guessing. Populated by the inbound inspection-request sync when that lands.
-- UNIQUE: one GS Retrofit inspection request maps to at most one local job.
ALTER TABLE public.jobs
  ADD COLUMN gsretrofit_inspection_request_id integer UNIQUE;
