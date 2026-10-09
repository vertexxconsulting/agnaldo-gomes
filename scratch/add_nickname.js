const { execSync } = require('child_process');
require('dotenv').config({path: '.env.local'});
try {
  execSync('npx supabase db query "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname TEXT;" --db-url "postgres://postgres.lmsylawikfhmzspwshis:o6L40B4yV!28@aws-0-us-west-1.pooler.supabase.com:5432/postgres"', {stdio: 'inherit'});
  console.log('Success');
} catch (e) {
  console.error(e.message);
}
