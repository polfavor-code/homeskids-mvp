import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zaoihhyoewvycuzxvhgs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphb2loaHlvZXd2eWN1enh2aGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjAyNDcsImV4cCI6MjA4MDE5NjI0N30.yPI7MM6c7TYt3EamNwzfr9Shy6RHlmbANTnCInVvToU';

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleContacts = [
    { name: 'Dr. Sarah Mitchell', role: 'Pediatrician', category: 'medical', phone: '+1 555-234-5678', email: 'dr.mitchell@kidsclinic.com', address: '123 Health Center Dr, Suite 200', notes: 'Annual checkup in March. Speaks Spanish.', is_favorite: true },
    { name: 'Dr. James Wong', role: 'Dentist', category: 'medical', phone: '+1 555-345-6789', email: 'jwong@smiledental.com', address: '456 Dental Plaza, Building B', notes: 'Cleanings every 6 months', is_favorite: false },
    { name: 'Emily Roberts', role: 'Allergist', category: 'medical', phone: '+1 555-456-7890', email: 'eroberts@allergycare.com', address: '789 Medical Center Blvd', notes: 'Peanut allergy management', is_favorite: true },
    { name: 'Ms. Jennifer Adams', role: '3rd Grade Teacher', category: 'school', phone: '+1 555-111-2222', email: 'jadams@elementary.edu', address: 'Lincoln Elementary School', notes: 'Room 204. Office hours: 3-4pm', is_favorite: true },
    { name: 'Mr. David Chen', role: 'Principal', category: 'school', phone: '+1 555-111-3333', email: 'dchen@elementary.edu', address: 'Lincoln Elementary School', notes: null, is_favorite: false },
    { name: 'Lisa Thompson', role: 'School Nurse', category: 'school', phone: '+1 555-111-4444', email: 'lthompson@elementary.edu', address: 'Lincoln Elementary School', notes: 'Has emergency meds on file', is_favorite: true },
    { name: 'Grandma Rose', role: "Grandmother (Mom's side)", category: 'family', phone: '+1 555-777-8888', email: 'rose.smith@email.com', address: '321 Oak Lane, Apt 5A', notes: 'Available for pickup on Fridays', is_favorite: true },
    { name: 'Uncle Mike', role: "Uncle (Dad's side)", category: 'family', phone: '+1 555-888-9999', email: 'mike.j@email.com', address: null, notes: 'Emergency contact backup', is_favorite: false },
    { name: 'Coach Rodriguez', role: 'Soccer Coach', category: 'activities', phone: '+1 555-222-3333', email: 'coach.r@youthsoccer.org', address: 'City Sports Complex, Field 3', notes: 'Practice: Tues/Thurs 4pm', is_favorite: false },
    { name: 'Ms. Piano Teacher', role: 'Piano Instructor', category: 'activities', phone: '+1 555-333-4444', email: 'piano.lessons@music.com', address: '567 Melody Street', notes: 'Lessons on Wednesdays 5pm', is_favorite: false },
    { name: 'Sarah (Babysitter)', role: 'Regular Babysitter', category: 'other', phone: '+1 555-444-5555', email: 'sarah.babysit@email.com', address: null, notes: 'Available weekends. CPR certified.', is_favorite: true },
    { name: 'Neighbors - The Johnsons', role: 'Next Door Neighbors', category: 'other', phone: '+1 555-555-6666', email: null, address: '124 Maple Street', notes: 'Have spare key for emergencies', is_favorite: false },
];

async function seedContacts() {
    console.log('Fetching families...');

    // Get the first family
    const { data: families, error: familiesError } = await supabase
        .from('families')
        .select('id')
        .limit(1);

    if (familiesError) {
        console.error('Error fetching families:', familiesError);
        return;
    }

    if (!families || families.length === 0) {
        console.error('No families found!');
        return;
    }

    const familyId = families[0].id;
    console.log('Using family_id:', familyId);

    // Delete existing contacts for this family
    console.log('Deleting existing contacts...');
    const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .eq('family_id', familyId);

    if (deleteError) {
        console.error('Error deleting contacts:', deleteError);
        return;
    }

    // Insert new contacts
    console.log('Inserting sample contacts...');
    const contactsWithFamily = sampleContacts.map(c => ({
        ...c,
        family_id: familyId
    }));

    const { data, error: insertError } = await supabase
        .from('contacts')
        .insert(contactsWithFamily)
        .select();

    if (insertError) {
        console.error('Error inserting contacts:', insertError);
        return;
    }

    console.log(`Successfully inserted ${data?.length} contacts!`);
}

seedContacts();
