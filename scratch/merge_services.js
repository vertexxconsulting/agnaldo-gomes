require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchFromSupabase(table) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  return res.json();
}

async function runMerge() {
  const servicos = await fetchFromSupabase('salon_services');
  
  const svcMap = {};
  for (const s of servicos) {
    let baseName = s.name.toLowerCase()
      .replace(/[áàãâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
      .replace(/[óòõôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/[ç]/g, 'c')
      .replace(/\s*(curto|medio|longo|extra longo|infantil|feminino|masculino|\(.*\)|-.*)\s*$/i, '')
      .replace(/\s+/g, ' ').trim();

    if (!svcMap[baseName]) svcMap[baseName] = [];
    svcMap[baseName].push(s);
  }

  for (const [base, items] of Object.entries(svcMap)) {
    if (items.length > 1) {
      console.log(`\nMerging group: ${base.toUpperCase()}`);
      // Find min and max price
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      let baseService = null;
      
      for (const item of items) {
        if (item.price < minPrice) {
          minPrice = item.price;
          baseService = item; // Keep the cheapest as the base
        }
        if (item.price > maxPrice) {
          maxPrice = item.price;
        }
      }
      
      // The base string is something like "selamento bsk". Let's Title Case it properly.
      const newName = base.replace(/(?:^|\s|-|\/)\S/g, a => a.toUpperCase()).replace(/Bsk/gi, 'BSK');
      
      console.log(` -> Base Service ID: ${baseService.id} | New Name: "${newName}" | Price: ${minPrice} to ${maxPrice}`);
      
      // 1. Update the base service
      await fetch(`${supabaseUrl}/rest/v1/salon_services?id=eq.${baseService.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: newName,
          preco_variavel: true,
          preco_maximo: maxPrice
        })
      });
      
      // 2. Delete the other services
      for (const item of items) {
        if (item.id !== baseService.id) {
          console.log(`    Deleting duplicate: ${item.name} (${item.id})`);
          await fetch(`${supabaseUrl}/rest/v1/salon_services?id=eq.${item.id}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
        }
      }
    }
  }
  console.log('\nMerge concluído!');
}

runMerge().catch(console.error);
