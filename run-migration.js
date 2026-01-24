const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qyskfuxvuzshdtzbtygx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5c2tmdXh2dXpzaGR0emJ0eWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDMwOTksImV4cCI6MjA3NDc3OTA5OX0.QyU5Zn9qMErS2zds-rho5BPXQADsF8oyz83kknjNsrs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔄 Running migration to add cleaner_hours column...\n');

  try {
    // Check if column exists first
    const { data: columns, error: checkError } = await supabase
      .from('schedule_entries')
      .select('cleaner_hours')
      .limit(1);

    if (!checkError) {
      console.log('✅ Column cleaner_hours already exists!');
      return;
    }

    console.log('Column does not exist, attempting to add it...');
    console.log('\n⚠️  NOTE: The anon key cannot run DDL commands.');
    console.log('You need to run this SQL manually in your Supabase dashboard:\n');
    console.log('1. Go to https://qyskfuxvuzshdtzbtygx.supabase.co');
    console.log('2. Click on "SQL Editor" in the left sidebar');
    console.log('3. Click "New Query"');
    console.log('4. Paste and run this SQL:\n');
    console.log('---START SQL---');
    console.log(`ALTER TABLE schedule_entries
ADD COLUMN IF NOT EXISTS cleaner_hours JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN schedule_entries.cleaner_hours IS 'Individual hours per cleaner, stored as {"cleanerName": hours}';

ALTER TABLE recurring_shifts
ADD COLUMN IF NOT EXISTS cleaner_hours JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN recurring_shifts.cleaner_hours IS 'Individual hours per cleaner for recurring patterns, stored as {"cleanerName": hours}';`);
    console.log('---END SQL---\n');
    console.log('5. Click "Run" to execute the SQL');
    console.log('6. Try editing a recurring shift again after running this SQL\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
