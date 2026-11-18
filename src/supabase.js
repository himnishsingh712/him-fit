// The Supabase client. URL and publishable key come from environment variables (see .env.example).
// The publishable key is safe to ship in the app: Row Level Security on the database
// is what keeps each user's data private.
import {createClient} from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');

export const sb = createClient(url, key, {
  auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true},
});
