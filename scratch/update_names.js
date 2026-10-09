require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchFromSupabase(table) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  return res.json();
}

async function updateInSupabase(table, id, data) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Erro atualizando ${table} id ${id}:`, err);
  }
}

function cleanProductName(name) {
  if (!name) return name;
  let cleaned = name.trim();
  // Remover EAN/SKU do final (ex: "EICO SHAMPOO NEUTRO 7891234567890")
  cleaned = cleaned.replace(/\s*\d{8,}\s*$/, '');
  // Remover "unidade"
  cleaned = cleaned.replace(/\s+-\s+Unidade$/i, '');
  // Tirar aquele lixo de *886867...
  cleaned = cleaned.replace(/^\*\d+/, '');
  // Title Case
  cleaned = cleaned.toLowerCase().replace(/(?:^|\s|-|\/)\S/g, function(a) { return a.toUpperCase(); });
  // Espaços extras
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

function cleanServiceName(name) {
  if (!name) return name;
  let cleaned = name.trim();
  
  // Title Case base
  cleaned = cleaned.toLowerCase().replace(/(?:^|\s|-|\/|\()\S/g, function(a) { return a.toUpperCase(); });
  
  // Padronizar com tracinhos em vez de solto ou entre parênteses
  // Ex: "Selamento Bsk Curto" -> "Selamento Bsk - Curto"
  // Ex: "Corte Masculino (equipe)" -> "Corte Masculino - Equipe"
  
  // Trocar parênteses no final por tracinho
  cleaned = cleaned.replace(/\s*\(\s*(.*?)\s*\)\s*$/, ' - $1');
  
  // Palavras de tamanho ou variação soltas no final viram "- Palavra"
  cleaned = cleaned.replace(/\s+(Curto|Medio|Médio|Longo|Extra Longo|Infantil|Equipe)\s*$/i, ' - $1');
  
  // Evitar duplicar tracinhos " - - "
  cleaned = cleaned.replace(/\s*-\s*-\s*/g, ' - ');
  
  // Acertar Bsk -> BSK, etc
  cleaned = cleaned.replace(/\bBsk\b/gi, 'BSK');
  
  // Espaços extras
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

async function runUpdate() {
  console.log('--- Iniciando Limpeza ---');

  // PRODUTOS
  console.log('Atualizando produtos...');
  const produtos = await fetchFromSupabase('salon_inventory');
  let pCount = 0;
  for (const p of (produtos || [])) {
    const novoNome = cleanProductName(p.name);
    if (novoNome !== p.name) {
      console.log(`[Prod] "${p.name}" -> "${novoNome}"`);
      await updateInSupabase('salon_inventory', p.id, { name: novoNome });
      pCount++;
    }
  }
  
  // SERVICOS
  console.log('Atualizando serviços...');
  const servicos = await fetchFromSupabase('salon_services');
  let sCount = 0;
  for (const s of (servicos || [])) {
    const novoNome = cleanServiceName(s.name);
    if (novoNome !== s.name) {
      console.log(`[Serv] "${s.name}" -> "${novoNome}"`);
      await updateInSupabase('salon_services', s.id, { name: novoNome });
      sCount++;
    }
  }

  console.log(`Concluído! ${pCount} produtos limpos, ${sCount} serviços padronizados.`);
}

runUpdate().catch(console.error);
