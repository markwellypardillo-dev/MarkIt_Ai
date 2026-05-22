import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lskoejolvcxvloshfosp.supabase.co';
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxza29lam9sdmN4dmxvc2hmb3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODc3MzIsImV4cCI6MjA5NDM2MzczMn0.sijaLtPflGeOsiJk0eDaL2_BtPZAU7uutE3ZH4-aql8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
