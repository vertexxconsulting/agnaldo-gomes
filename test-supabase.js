const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nbxikhiwdzllhgypkfyw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieGlraGl3ZHpsbGhneXBrZnl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM1NjEyOSwiZXhwIjoyMTAxOTMyMTI5fQ.KlVdm364FNfKOhTkezd2LH6XTCFpObm_thklXwKVxWc';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'agnaldogom@icloud.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: { role: 'ADMIN', full_name: 'Agnaldo Gomes' }
  });

  if (error) {
    console.error("ERRO:", error.message);
  } else {
    console.log("SUCESSO:", data.user.id);
  }
}

test();
