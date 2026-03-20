import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

async function runMigration() {
    console.log('Running regimens migration...');

    const sqlPath = path.join(__dirname, '..', 'supabase-setup-regimens.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolons but be careful with functions
    // For simplicity, we'll run the whole thing
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
        // exec_sql might not exist, try direct approach
        console.log('exec_sql not available, trying individual statements...');

        // Split into statements (simple split, may need adjustment for complex SQL)
        const statements = sql
            .split(/;\s*\n/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            if (!stmt) continue;

            try {
                // Use raw SQL via REST API
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({})
                });
            } catch (e) {
                // Ignore individual errors for now
            }
        }
    }

    console.log('Migration attempted. Please verify tables in Supabase dashboard.');
}

// Alternative: Use postgres directly if available
async function runWithPsql() {
    const { execSync } = await import('child_process');

    // Try to get database URL from env
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

    if (dbUrl) {
        console.log('Running with psql...');
        const sqlPath = path.join(__dirname, '..', 'supabase-setup-regimens.sql');
        try {
            execSync(`psql "${dbUrl}" -f "${sqlPath}"`, { stdio: 'inherit' });
            console.log('Migration completed successfully!');
            return true;
        } catch (e) {
            console.error('psql failed:', e.message);
            return false;
        }
    }
    return false;
}

// Main
(async () => {
    // Try psql first
    const psqlSuccess = await runWithPsql();
    if (!psqlSuccess) {
        console.log('\nPlease run the SQL manually:');
        console.log('1. Go to Supabase Dashboard > SQL Editor');
        console.log('2. Open and run: supabase-setup-regimens.sql');
    }
})();
