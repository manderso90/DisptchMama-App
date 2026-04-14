import { createClient } from '@/lib/supabase/server'
import type { Job, JobStatusHistory, Inspector } from '@/types/database'

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

export async function getJobStatusHistory(
  jobId: string
): Promise<(JobStatusHistory & { changed_by_name: string | null })[]> {
  const supabase = await createClient()

  const { data: history, error } = await supabase
    .from('job_status_history')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Batch-fetch team member names for changed_by
  const changerIds = [
    ...new Set(
      (history ?? [])
        .map((h) => h.changed_by)
        .filter((id): id is string => id !== null)
    ),
  ]

  let changerMap: Record<string, string> = {}
  if (changerIds.length > 0) {
    const { data: members } = await supabase
      .from('team_members')
      .select('id, full_name, email')
      .in('id', changerIds)

    changerMap = Object.fromEntries(
      (members ?? []).map((m) => [m.id, m.full_name ?? m.email ?? 'Unknown'])
    )
  }

  return (history ?? []).map((h) => ({
    ...h,
    changed_by_name: h.changed_by ? (changerMap[h.changed_by] ?? null) : null,
  }))
}

export async function getActiveInspectors(): Promise<Pick<Inspector, 'id' | 'full_name' | 'region'>[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspectors')
    .select('id, full_name, region')
    .eq('is_active', true)
    .order('full_name')

  if (error) throw error
  return data ?? []
}
