import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aibziwmvvbsjhlpbexou.supabase.co'
const supabaseAnonKey = 'sb_publishable_6ZYXgqVyrsH7GqeLD3f_JQ_xu6lL8KU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})