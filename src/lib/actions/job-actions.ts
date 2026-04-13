'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createJob(data: {
  title: string
  client_name?: string
  address: string
  city?: string
  state?: string
  zip_code?: string
  has_lockbox?: boolean
  requested_date?: string
  requested_time_preference?: string
  estimated_duration_minutes?: number
  notes?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('jobs').insert({
    title: data.title,
    client_name: data.client_name || '',
    address: data.address,
    city: data.city || '',
    state: data.state || '',
    zip_code: data.zip_code || '',
    has_lockbox: data.has_lockbox ?? false,
    requested_date: data.requested_date || null,
    requested_time_preference: data.requested_time_preference || null,
    estimated_duration_minutes: data.estimated_duration_minutes || 60,
    notes: data.notes || null,
  })

  if (error) throw error

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')
}

export async function updateJobStatus(jobId: string, status: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Get current status for history
  const { data: current } = await supabase
    .from('jobs')
    .select('status')
    .eq('id', jobId)
    .single()

  const { error } = await supabase
    .from('jobs')
    .update({ status })
    .eq('id', jobId)

  if (error) throw error

  // Log status change
  await supabase.from('job_status_history').insert({
    job_id: jobId,
    changed_by: user.id,
    from_status: current?.status ?? null,
    to_status: status,
  })

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId)

  if (error) throw error

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')
}
