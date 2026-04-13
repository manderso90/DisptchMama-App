-- DisptchMama — Standalone Dispatch Board Schema
-- Run this against a fresh Supabase project

-- ─── Team Members ───
create table public.team_members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'field_tech' check (role in ('admin', 'dispatcher', 'field_tech')),
  phone text,
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

create policy "Authenticated users can read team_members"
  on public.team_members for select
  to authenticated
  using (true);

create policy "Admins can insert team_members"
  on public.team_members for insert
  to authenticated
  with check (true);

create policy "Admins can update team_members"
  on public.team_members for update
  to authenticated
  using (true);

create policy "Admins can delete team_members"
  on public.team_members for delete
  to authenticated
  using (true);

-- ─── Inspectors ───
create table public.inspectors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  is_active boolean not null default true,
  region text not null default 'Valley',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inspectors enable row level security;

create policy "Authenticated users can read inspectors"
  on public.inspectors for select
  to authenticated
  using (true);

create policy "Authenticated users can insert inspectors"
  on public.inspectors for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update inspectors"
  on public.inspectors for update
  to authenticated
  using (true);

create policy "Authenticated users can delete inspectors"
  on public.inspectors for delete
  to authenticated
  using (true);

-- ─── Jobs ───
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text,
  client_name text not null default '',
  client_phone text,
  client_email text,
  address text not null default '',
  city text not null default '',
  state text not null default 'CA',
  zip_code text not null default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  assigned_to uuid references public.inspectors(id) on delete set null,
  requested_date date,
  requested_time_preference text check (requested_time_preference in ('morning', 'afternoon', 'anytime', 'flexible')),
  scheduled_date date,
  scheduled_time time,
  scheduled_end time,
  estimated_duration_minutes integer not null default 60,
  dispatch_status text not null default 'unscheduled' check (dispatch_status in ('unscheduled', 'scheduled', 'dispatched', 'en_route')),
  notes text,
  last_reassigned_by uuid,
  last_reassigned_at timestamptz,
  has_lockbox boolean not null default false,
  schedule_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs enable row level security;

create policy "Authenticated users can read jobs"
  on public.jobs for select
  to authenticated
  using (true);

create policy "Authenticated users can insert jobs"
  on public.jobs for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update jobs"
  on public.jobs for update
  to authenticated
  using (true);

create policy "Authenticated users can delete jobs"
  on public.jobs for delete
  to authenticated
  using (true);

-- ─── Job Status History ───
create table public.job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  changed_by uuid references public.team_members(id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.job_status_history enable row level security;

create policy "Authenticated users can read job_status_history"
  on public.job_status_history for select
  to authenticated
  using (true);

create policy "Authenticated users can insert job_status_history"
  on public.job_status_history for insert
  to authenticated
  with check (true);

-- ─── Trigger: auto-compute scheduled_end ───
create or replace function public.compute_scheduled_end()
returns trigger as $$
begin
  if NEW.scheduled_time is not null and NEW.estimated_duration_minutes is not null then
    NEW.scheduled_end := NEW.scheduled_time + (NEW.estimated_duration_minutes || ' minutes')::interval;
  else
    NEW.scheduled_end := null;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_compute_scheduled_end
  before insert or update of scheduled_time, estimated_duration_minutes
  on public.jobs
  for each row
  execute function public.compute_scheduled_end();

-- ─── Trigger: auto-update updated_at ───
create or replace function public.update_updated_at()
returns trigger as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$ language plpgsql;

create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row
  execute function public.update_updated_at();

create trigger trg_team_members_updated_at
  before update on public.team_members
  for each row
  execute function public.update_updated_at();

create trigger trg_inspectors_updated_at
  before update on public.inspectors
  for each row
  execute function public.update_updated_at();

-- ─── Enable Realtime ───
alter publication supabase_realtime add table public.jobs;
