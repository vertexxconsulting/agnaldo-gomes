require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkAvatar() {
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=avatar_url&limit=5`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const data = await res.json();
  
  for (const p of data) {
    if (p.avatar_url) {
      console.log(`Checking URL: ${p.avatar_url}`);
      try {
        const resUrl = await fetch(p.avatar_url, { method: 'HEAD' });
        console.log(`Status: ${resUrl.status}`);
      } catch (e) {
        console.log(`Fetch error:`, e.message);
      }
    }
  }
}

checkAvatar();
