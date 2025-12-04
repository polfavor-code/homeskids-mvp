import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error(
        'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL is required in src/lib/supabase.ts. ' +
        'Please set it in your .env.local file.'
    );
}

if (!supabaseAnonKey) {
    throw new Error(
        'Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY is required in src/lib/supabase.ts. ' +
        'Please set it in your .env.local file.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
