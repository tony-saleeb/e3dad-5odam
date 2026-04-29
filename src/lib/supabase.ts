import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isValid = supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder');
const finalUrl = isValid ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = isValid ? supabaseAnonKey : 'placeholder-anon-key';

export const isSupabaseConfigured = !!isValid;
export const supabase = createClient(finalUrl, finalKey);
