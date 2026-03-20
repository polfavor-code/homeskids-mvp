const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env file manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2];
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

// Extract project ref
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
console.log('Project ref:', projectRef);
console.log('Supabase URL:', supabaseUrl);

// The Supabase JS client cannot run raw DDL SQL
// We need to use the Management API or direct database connection
// Since we don't have database password, provide instructions

console.log('\n========================================');
console.log('MIGRATION INSTRUCTIONS');
console.log('========================================\n');
console.log('The SQL file is ready at: supabase-setup-regimens.sql\n');
console.log('To run it, go to your Supabase dashboard:');
console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
console.log('Then copy and paste the contents of supabase-setup-regimens.sql and click "Run".\n');
console.log('Alternatively, if you have the database password, run:');
console.log(`npx supabase db query -f supabase-setup-regimens.sql --db-url "postgresql://postgres.[your-project-ref]:[your-db-password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"\n`);
