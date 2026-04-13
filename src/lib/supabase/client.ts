import { createBrowserClient } from '@supabase/ssr'

// Note: Once your Supabase project is connected, regenerate types with:
// npx supabase gen types typescript --project-id YOUR_ID > src/types/database.ts
// Then re-add the Database generic: createBrowserClient<Database>(...)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
