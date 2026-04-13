import { createClient } from '@/lib/supabase/server'
import type { Inspector, Job } from '@/types/database'

export async function getInspectors(): Promise<Inspector[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspectors')
    .select('*')
    .order('full_name')

  if (error) throw error
  return data ?? []
}

export async function getInspectorById(
  inspectorId: string
): Promise<Inspector | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspectors')
    .select('*')
    .eq('id', inspectorId)
    .single()

  if (error || !data) return null
  return data
}

export async function getInspectorJobs(
  inspectorId: string
): Promise<{ total: number; upcoming: Job[] }> {
  const supabase = await createClient()

  // All jobs assigned to this inspector (for total count)
  const { data: allJobs, error: allError } = await supabase
    .from('jobs')
    .select('*')
    .eq('assigned_to', inspectorId)

  if (allError) throw allError

  const total = allJobs?.length ?? 0

  // Upcoming scheduled jobs: have a scheduled_date on or after today
  const today = new Date().toISOString().split('T')[0]
  const upcoming = (allJobs ?? [])
    .filter((j) => j.scheduled_date && j.scheduled_date >= today)
    .sort((a, b) => {
      const dateA = a.scheduled_date ?? ''
      const dateB = b.scheduled_date ?? ''
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      return (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? '')
    })
    .slice(0, 10)

  return { total, upcoming }
}
