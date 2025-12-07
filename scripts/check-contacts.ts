import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://zaoihhyoewvycuzxvhgs.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphb2loaHlvZXd2eWN1enh2aGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjAyNDcsImV4cCI6MjA4MDE5NjI0N30.yPI7MM6c7TYt3EamNwzfr9Shy6RHlmbANTnCInVvToU'
);

async function check() {
    const { data, error } = await supabase.from('contacts').select('id, name, family_id');
    console.log('Contacts count:', data?.length);
    console.log('Contacts:', data);
    console.log('Error:', error);
}

check();
