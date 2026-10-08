const { execSync } = require('child_process');
require('dotenv').config({path: '.env.local'});
try {
  execSync('npx supabase db execute --db-url "' + process.env.DATABASE_URL + '" "ALTER TABLE salon_appointments ADD COLUMN IF NOT EXISTS sub_services JSONB DEFAULT \'[]\'::jsonb;"', {stdio: 'inherit'});
  console.log('Success');
} catch (e) {
  console.error(e.message);
}
