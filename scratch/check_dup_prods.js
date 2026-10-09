require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchFromSupabase(table) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  return res.json();
}

async function check() {
  const produtos = await fetchFromSupabase('salon_inventory');
  
  const pMap = {};
  for (const p of (produtos || [])) {
    const limpo = p.name.toLowerCase().trim().replace(/\s*\d{8,}\s*$/, '');
    if (!pMap[limpo]) pMap[limpo] = [];
    pMap[limpo].push(p);
  }
  
  let dupCount = 0;
  for (const [name, items] of Object.entries(pMap)) {
    if (items.length > 1) {
      dupCount++;
      console.log(`DUPLICATE PROD: ${name}`);
      items.forEach(i => console.log(` - ${i.name} | Cost: ${i.cost_price} | Sale: ${i.sale_price}`));
    }
  }
  console.log(`Found ${dupCount} duplicate products.`);
}

check().catch(console.error);
