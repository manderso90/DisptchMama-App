'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createInspector(data: {
  full_name: string
  phone?: string
  email?: string
  region?: string
  notes?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const name = data.full_name?.trim()
  if (!name) throw new Error('Full name is required')

  const { error } = await supabase.from('inspectors').insert({
    full_name: name,
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    region: data.region?.trim() || 'Valley',
    notes: data.notes?.trim() || null,
  })

  if (error) throw error

  revalidatePath('/admin/inspectors')
  revalidatePath('/admin/dispatch')
}

export async function updateInspector(
  inspectorId: string,
  data: {
    full_name?: string
    phone?: string
    email?: string
    region?: string
    is_active?: boolean
    notes?: string
  }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (data.full_name !== undefined && !data.full_name.trim()) {
    throw new Error('Full name is required')
  }

  // Build typed update object
  const update: {
    full_name?: string
    phone?: string | null
    email?: string | null
    region?: string
    is_active?: boolean
    notes?: string | null
  } = {}

  if (data.full_name !== undefined) update.full_name = data.full_name.trim()
  if (data.phone !== undefined) update.phone = data.phone.trim() || null
  if (data.email !== undefined) update.email = data.email.trim() || null
  if (data.region !== undefined) update.region = data.region.trim()
  if (data.is_active !== undefined) update.is_active = data.is_active
  if (data.notes !== undefined) update.notes = data.notes.trim() || null

  const { error } = await supabase
    .from('inspectors')
    .update(update)
    .eq('id', inspectorId)

  if (error) throw error

  revalidatePath('/admin/inspectors')
  revalidatePath(`/admin/inspectors/${inspectorId}`)
  revalidatePath('/admin/dispatch')
  revalidatePath('/admin/jobs')
}

export async function deleteInspector(inspectorId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Block deletion if any jobs are still assigned to this inspector
  const { count, error: countError } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', inspectorId)

  if (countError) throw countError

  if (count && count > 0) {
    throw new Error(
      `Cannot delete this inspector. ${count} job${count > 1 ? 's are' : ' is'} still assigned. Reassign or clear those jobs first.`
    )
  }

  const { error } = await supabase
    .from('inspectors')
    .delete()
    .eq('id', inspectorId)

  if (error) throw error

  revalidatePath('/admin/inspectors')
  revalidatePath('/admin/dispatch')
  revalidatePath('/admin/jobs')
}
