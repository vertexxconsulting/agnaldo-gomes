const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nbxikhiwdzllhgypkfyw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieGlraGl3ZHpsbGhneXBrZnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM1NjEyOSwiZXhwIjoyMTAxOTMyMTI5fQ.KlVdm364FNfKOhTkezd2LH6XTCFpObm_thklXwKVxWc');

async function run() {
  const { data, error } = await supabase.auth.admin.listUsers();
  const user = data.users.find(u => u.email === 'agnaldogom@icloud.com');
  if (user) {
    await supabase.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, role: 'ADMIN' } });
    console.log('User role updated to ADMIN');
  } else {
    console.log('User not found');
  }
}
run();
