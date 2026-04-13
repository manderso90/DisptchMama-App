import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function getInspectors(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('inspectors')
    .select('*')
    .order('full_name', { ascending: true })

  if (error) throw error

  return data ?? []
}
