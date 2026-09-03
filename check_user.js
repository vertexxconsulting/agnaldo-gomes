const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nbxikhiwdzllhgypkfyw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieGlraGl3ZHpsbGhneXBrZnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM1NjEyOSwiZXhwIjoyMTAxOTMyMTI5fQ.KlVdm364FNfKOhTkezd2LH6XTCFpObm_thklXwKVxWc');
async function run() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error(error); return; }
  const user = data.users.find(u => u.email === 'agnaldogom@icloud.com');
  console.log('agnaldo metadata:', user ? user.user_metadata : 'User not found');
}
run();
