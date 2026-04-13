-- Migration: Add inspectors table and has_lockbox column to jobs
-- Created: 2026-04-06

-- ─── Inspectors ───
create table public.inspectors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  is_active boolean not null default true,
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

-- Auto-update updated_at on inspectors
create trigger trg_inspectors_updated_at
  before update on public.inspectors
  for each row
  execute function public.update_updated_at();

-- ─── Add has_lockbox to jobs ───
alter table public.jobs add column has_lockbox boolean not null default false;
