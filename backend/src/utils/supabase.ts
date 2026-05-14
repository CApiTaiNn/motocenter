import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (client) return client

  const url = process.env.SUPABASE_PROJECT_URL
  const key = process.env.SUPABASE_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_PROJECT_URL and SUPABASE_KEY in your .env to use this feature.'
    )
  }

  client = createClient(url, key)
  return client
}
