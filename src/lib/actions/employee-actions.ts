'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('team_members')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Admin access required')

  return { supabase, user }
}

export async function updateEmployee(
  employeeId: string,
  data: {
    full_name?: string
    role?: 'admin' | 'dispatcher' | 'field_tech'
    phone?: string
    is_active?: boolean
  }
) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('team_members')
    .update(data)
    .eq('id', employeeId)
  if (error) throw error

  revalidatePath('/admin/settings')
}

export async function deactivateEmployee(employeeId: string) {
  await updateEmployee(employeeId, { is_active: false })
}

export async function deleteEmployee(employeeId: string) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', employeeId)
  if (error) throw error

  revalidatePath('/admin/settings')
}
