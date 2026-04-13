import { createClient } from '@/lib/supabase/server'
import type { Job } from '@/types/database'

export async function getJobsList(): Promise<(Job & { inspector_name: string | null })[]> {
  const supabase = await createClient()

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*, inspectors(full_name)')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (jobs ?? []).map((job: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insp = job.inspectors as any
    return {
      ...job,
      inspector_name: insp?.full_name ?? null,
    }
  }) as (Job & { inspector_name: string | null })[]
}

export async function getJobDetail(jobId: string): Promise<(Job & { inspector_name: string | null }) | null> {
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*, inspectors(full_name)')
    .eq('id', jobId)
    .single()

  if (error || !job) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insp = (job as any).inspectors as any
  return {
    ...(job as unknown as Job),
    inspector_name: insp?.full_name ?? null,
  }
}
