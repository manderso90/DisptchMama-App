'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createInspector(data: {
  full_name: string
  region?: string
  notes?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('inspectors').insert({
    full_name: data.full_name,
    region: data.region || 'Valley',
    notes: data.notes || null,
  })

  if (error) throw error

  revalidatePath('/admin/inspectors')
}

export async function updateInspector(
  id: string,
  data: {
    full_name?: string
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

  const { error } = await supabase
    .from('inspectors')
    .update({
      full_name: data.full_name,
      region: data.region,
      is_active: data.is_active,
      notes: data.notes,
    })
    .eq('id', id)

  if (error) throw error

  revalidatePath('/admin/inspectors')
}

export async function deleteInspector(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('inspectors')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath('/admin/inspectors')
}
