import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export const db = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)
