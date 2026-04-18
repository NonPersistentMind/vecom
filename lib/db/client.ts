import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Untyped client — repository functions carry explicit return types instead.
// Supabase's generated-type format differs across client versions; hand-writing
// it correctly is fragile. Explicit annotations on each function are clearer.
export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)
