const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nbxikhiwdzllhgypkfyw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieGlraGl3ZHpsbGhneXBrZnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM1NjEyOSwiZXhwIjoyMTAxOTMyMTI5fQ.KlVdm364FNfKOhTkezd2LH6XTCFpObm_thklXwKVxWc';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  
  const user = data.users.find(u => u.email === 'agnaldogom@icloud.com');
  if (user) {
    console.log("Found user in auth:", user.id);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: 'Agnaldo Gomes',
        role: 'ADMIN' // or 'studio_admin'
      });
      
    if (profileError) {
      console.error("Error upserting profile:", profileError);
    } else {
      console.log("Profile created/updated successfully!");
    }
  } else {
    console.log("User not found in auth.");
  }
}

fix();
