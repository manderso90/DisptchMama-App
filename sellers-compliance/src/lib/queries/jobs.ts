import { createClient } from '@/lib/supabase/server'
import type { Job, JobStatusHistory, Inspector } from '@/types/database'

export async function getJobsList(): Promise<(Job & { inspector_name: string | null })[]> {
  const supabase = await createClient()

  // Fetch all jobs ordered by most recent first
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })

  if (jobsError) throw jobsError

  // Collect unique inspector IDs to batch-fetch names
  const inspectorIds = [
    ...new Set(
      (jobs ?? [])
        .map((j) => j.assigned_to)
        .filter((id): id is string => id !== null)
    ),
  ]

  // Fetch inspector names in a single query
  let inspectorMap: Record<string, string> = {}
  if (inspectorIds.length > 0) {
    const { data: inspectors, error: inspError } = await supabase
      .from('inspectors')
      .select('id, full_name')
      .in('id', inspectorIds)

    if (inspError) throw inspError

    inspectorMap = Object.fromEntries(
      (inspectors ?? []).map((i) => [i.id, i.full_name])
    )
  }

  return (jobs ?? []).map((job) => ({
    ...job,
    inspector_name: job.assigned_to ? (inspectorMap[job.assigned_to] ?? null) : null,
  }))
}

export async function getJobById(jobId: string): Promise<(Job & { inspector_name: string | null }) | null> {
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !job) return null

  // Fetch inspector name if assigned
  let inspectorName: string | null = null
  if (job.assigned_to) {
    const { data: inspector } = await supabase
      .from('inspectors')
      .select('full_name')
      .eq('id', job.assigned_to)
      .single()

    inspectorName = inspector?.full_name ?? null
  }

  return { ...job, inspector_name: inspectorName }
}

export async function getJobStatusHistory(jobId: string): Promise<(JobStatusHistory & { changed_by_name: string | null })[]> {
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
