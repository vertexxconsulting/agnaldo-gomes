const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nbxikhiwdzllhgypkfyw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieGlraGl3ZHpsbGhneXBrZnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM1NjEyOSwiZXhwIjoyMTAxOTMyMTI5fQ.KlVdm364FNfKOhTkezd2LH6XTCFpObm_thklXwKVxWc');

async function run() {
  const email = 'agnaldogom@icloud.com';
  const password = 'Admin123456!';
  
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error(error); return; }
  
  const user = data.users.find(u => u.email === email);
  
  if (user) {
    await supabase.auth.admin.updateUserById(user.id, { 
      password, 
      email_confirm: true, 
      user_metadata: { role: 'admin', isOwner: true } 
    });
    console.log('User updated successfully.');
  } else {
    await supabase.auth.admin.createUser({ 
      email, 
      password, 
      email_confirm: true, 
      user_metadata: { role: 'admin', isOwner: true } 
    });
    console.log('User created successfully.');
  }
}
run();
