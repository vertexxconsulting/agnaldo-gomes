const { execSync } = require('child_process');
require('dotenv').config({path: '.env.local'});
try {
  execSync('npx supabase db query --file supabase_migration_integra_estoque.sql --db-url "' + process.env.DATABASE_URL + '"', {stdio: 'inherit'});
  console.log('Success');
} catch (e) {
  console.error(e.message);
}
