-- Enable Supabase Realtime on the jobs table so the dispatch timeline and the
-- Jobs page refresh live when rows change (e.g. the scheduled GS Retrofit sync
-- inserts new jobs). The supabase_realtime publication existed but had no tables.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.jobs;
