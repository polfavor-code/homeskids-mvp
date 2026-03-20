#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
    console.error('Could not extract project ref from URL');
    process.exit(1);
}

const sqlPath = path.join(__dirname, '..', 'supabase-setup-regimens.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

async function runSQL() {
    console.log(`Running migration on project: ${projectRef}`);

    // Use Supabase's SQL endpoint (requires service role key)
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({})
    });

    // The REST API doesn't support raw SQL, we need to use the pg endpoint
    // Try the query endpoint
    const pgResponse = await fetch(`${supabaseUrl.replace('.supabase.co', '.supabase.co')}/pg/query`, {
        method: 'POST',
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
    });

    if (pgResponse.ok) {
        console.log('Migration successful!');
        return;
    }

    console.log('Direct SQL not available via REST API.');
    console.log('\nTo run the migration:');
    console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log('2. Copy and paste the contents of supabase-setup-regimens.sql');
    console.log('3. Click "Run"');
    console.log('\nOr use npx supabase db push after linking your project.');
}

runSQL().catch(console.error);
