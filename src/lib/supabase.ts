import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Feature flags - set to true once you've created these tables in Supabase
// This prevents 404/406 errors in the console for tables that don't exist yet
export const FEATURES = {
    BAG_ESSENTIALS: true,     // Table created
    BAG_TRANSFERS: true,      // Table created
    CONTACTS: true,           // Table created
    HOME_ACCESS: true,        // Table created
    TRAVEL_BAGS: false,       // Set to true after creating travel_bags table

    // V2 Permission Model - Child-centric permissions
    // Uses new tables: children, homes, child_access, etc.
    // V2 contexts are backward-compatible with V1 interfaces
    V2_PERMISSIONS: true,     // Enabled - using new child-centric permission model
};

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
