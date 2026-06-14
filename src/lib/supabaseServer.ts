import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service_role key.
 *
 * IMPORTANT: This file must NEVER be imported from client components ('use client').
 * The service_role key bypasses all RLS policies — it is only safe on the server.
 * It is not prefixed with NEXT_PUBLIC_ so Next.js will never send it to the browser.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is not set. This is required for server-side database writes.'
  );
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    // Disable auto-refresh — server clients don't need session management
    autoRefreshToken: false,
    persistSession: false,
  },
});
