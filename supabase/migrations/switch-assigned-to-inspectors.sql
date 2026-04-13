-- Null out existing assignments (they reference team_members, not inspectors)
UPDATE public.jobs SET assigned_to = NULL WHERE assigned_to IS NOT NULL;

-- Drop old FK constraint
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_assigned_to_fkey;

-- Add new FK to inspectors
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.inspectors(id) ON DELETE SET NULL;
