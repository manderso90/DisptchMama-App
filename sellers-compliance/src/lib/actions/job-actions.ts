'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isValidTransition, validateJobInput } from '@/services/job-lifecycle'
import type { JobStatus } from '@/types/database'

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

  // Server-side validation via services layer
  const validation = validateJobInput({
    title: data.title,
    address: data.address,
    estimated_duration_minutes: data.estimated_duration_minutes,
    requested_time_preference: data.requested_time_preference,
  })
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  // Server-side defaults and normalization
  const trimmed = {
    title: data.title.trim(),
    client_name: data.client_name?.trim() || '',
    address: data.address.trim(),
    city: data.city?.trim() || '',
    state: data.state?.trim() || '',
    zip_code: data.zip_code?.trim() || '',
    has_lockbox: data.has_lockbox ?? false,
    requested_date: data.requested_date?.trim() || null,
    requested_time_preference: (data.requested_time_preference?.trim() || null) as
      'morning' | 'afternoon' | 'anytime' | 'flexible' | null,
    estimated_duration_minutes: data.estimated_duration_minutes ?? 15,
    notes: data.notes?.trim() || null,
    status: 'pending' as const,
    dispatch_status: 'unscheduled' as const,
  }

  const { data: newJob, error } = await supabase
    .from('jobs')
    .insert(trimmed)
    .select('id')
    .single()

  if (error) throw error

  // Log initial status to history
  await supabase.from('job_status_history').insert({
    job_id: newJob.id,
    changed_by: user.id,
    from_status: null,
    to_status: 'pending',
    note: 'Job created',
  })

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')
}

export async function updateJobStatus(jobId: string, newStatus: JobStatus) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Fetch current job status
  const { data: current, error: fetchError } = await supabase
    .from('jobs')
    .select('status')
    .eq('id', jobId)
    .single()

  if (fetchError || !current) throw new Error('Job not found')

  // Enforce valid transitions via services layer
  const currentStatus = current.status as JobStatus
  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(
      `Cannot transition from "${currentStatus}" to "${newStatus}"`
    )
  }

  const { error: updateError } = await supabase
    .from('jobs')
    .update({ status: newStatus })
    .eq('id', jobId)

  if (updateError) throw updateError

  // Log status change to history
  await supabase.from('job_status_history').insert({
    job_id: jobId,
    changed_by: user.id,
    from_status: currentStatus,
    to_status: newStatus,
  })

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/dispatch')
}

export async function updateJob(
  jobId: string,
  data: {
    title?: string
    client_name?: string
    client_phone?: string
    client_email?: string
    address?: string
    city?: string
    state?: string
    zip_code?: string
    has_lockbox?: boolean
    requested_date?: string
    requested_time_preference?: string
    scheduled_date?: string
    scheduled_time?: string
    estimated_duration_minutes?: number
    notes?: string
  }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Validate fields that have rules
  const validation = validateJobInput({
    title: data.title,
    address: data.address,
    estimated_duration_minutes: data.estimated_duration_minutes,
    requested_time_preference: data.requested_time_preference,
  })
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  // Normalize: trim strings, convert blanks to null for optional fields
  const update: {
    title?: string
    client_name?: string
    client_phone?: string | null
    client_email?: string | null
    address?: string
    city?: string
    state?: string
    zip_code?: string
    has_lockbox?: boolean
    requested_date?: string | null
    requested_time_preference?: 'morning' | 'afternoon' | 'anytime' | 'flexible' | null
    scheduled_date?: string | null
    scheduled_time?: string | null
    estimated_duration_minutes?: number
    notes?: string | null
  } = {}
  if (data.title !== undefined) update.title = data.title.trim()
  if (data.client_name !== undefined) update.client_name = data.client_name.trim() || ''
  if (data.client_phone !== undefined) update.client_phone = data.client_phone.trim() || null
  if (data.client_email !== undefined) update.client_email = data.client_email.trim() || null
  if (data.address !== undefined) update.address = data.address.trim()
  if (data.city !== undefined) update.city = data.city.trim() || ''
  if (data.state !== undefined) update.state = data.state.trim() || ''
  if (data.zip_code !== undefined) update.zip_code = data.zip_code.trim() || ''
  if (data.has_lockbox !== undefined) update.has_lockbox = data.has_lockbox
  if (data.requested_date !== undefined) update.requested_date = data.requested_date.trim() || null
  if (data.requested_time_preference !== undefined) {
    update.requested_time_preference = (data.requested_time_preference.trim() || null) as
      'morning' | 'afternoon' | 'anytime' | 'flexible' | null
  }
  if (data.scheduled_date !== undefined) update.scheduled_date = data.scheduled_date.trim() || null
  if (data.scheduled_time !== undefined) update.scheduled_time = data.scheduled_time.trim() || null
  if (data.estimated_duration_minutes !== undefined) {
    update.estimated_duration_minutes = data.estimated_duration_minutes
  }
  if (data.notes !== undefined) update.notes = data.notes.trim() || null

  const { error } = await supabase
    .from('jobs')
    .update(update)
    .eq('id', jobId)

  if (error) throw error

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/dispatch')
}

export async function assignInspector(jobId: string, inspectorId: string | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('jobs')
    .update({
      assigned_to: inspectorId,
      last_reassigned_by: user.id,
      last_reassigned_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) throw error

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/dispatch')
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('jobs').delete().eq('id', jobId)

  if (error) throw error

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')
}
