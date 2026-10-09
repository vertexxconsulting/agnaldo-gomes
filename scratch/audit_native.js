require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchFromSupabase(table) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  if (data.error || data.message) console.error('API Error:', data);
  return Array.isArray(data) ? data : [];
}

function cleanName(name) {
  if (!name) return name;
  let cleaned = name.trim();
  cleaned = cleaned.replace(/\s*\d{8,}\s*$/, '');
  cleaned = cleaned.replace(/\s+-\s+Unidade$/i, '');
  cleaned = cleaned.toLowerCase().replace(/(?:^|\s|-|\/)\S/g, function(a) { return a.toUpperCase(); });
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

async function runAudit() {
  console.log('Buscando servicos...');
  const servicos = await fetchFromSupabase('salon_services');
  
  console.log('Buscando produtos...');
  const produtos = await fetchFromSupabase('salon_inventory');

  let report = '# 🔎 Auditoria de Nomes no Sistema (Produtos e Serviços)\n\n';

  report += '## 📦 Estoque: Produtos com Nomes que Podem Melhorar\n\n';
  report += '| Produto Original | Sugestão de Novo Nome |\n';
  report += '|---|---|\n';
  
  let prodsNeedsClean = 0;
  for (const p of produtos) {
    const limpo = cleanName(p.name);
    if (limpo !== p.name && (p.name === p.name.toUpperCase() || /\d{8,}/.test(p.name) || /- Unidade/i.test(p.name))) {
      prodsNeedsClean++;
      report += `| ${p.name} | **${limpo}** |\n`;
    }
  }
  if (prodsNeedsClean === 0) report += '| Todos os produtos parecem estar OK | - |\n';

  report += '\n## 💇‍♀️ Serviços: Possíveis Duplicações e Bagunça\n\n';
  
  const svcMap = {};
  for (const s of servicos) {
    let baseName = s.name.toLowerCase()
      .replace(/[áàãâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
      .replace(/[óòõôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/[ç]/g, 'c')
      // Remove modifiers like "Curto", "Longo", "Feminino" to group them
      .replace(/\s*(curto|medio|longo|extra longo|infantil|feminino|masculino|\(.*\)|-.*)\s*$/i, '')
      .replace(/\s+/g, ' ').trim();

    if (!svcMap[baseName]) svcMap[baseName] = [];
    svcMap[baseName].push(s);
  }

  report += '### Serviços Repetidos (Apenas variação de preço/tamanho)\n';
  report += 'Estes serviços podem ser unidos ou terem seus nomes padronizados para ficarem mais bonitos no agendamento.\n\n';
  
  let dupCount = 0;
  for (const [base, items] of Object.entries(svcMap)) {
    if (items.length > 1) {
      dupCount++;
      report += `**Grupo Suspeito: "${base.toUpperCase()}"**\n`;
      for (const item of items) {
        report += `- ${item.name} (R$ ${item.price})\n`;
      }
      report += '\n';
    }
  }

  if (dupCount === 0) report += '*Nenhum serviço repetido encontrado.*\n';

  report += '### Serviços com nomes tudo em MAIÚSCULO\n';
  report += '| Nome Original | Sugestão de Novo Nome |\n';
  report += '|---|---|\n';
  
  let svcsNeedsClean = 0;
  for (const s of servicos) {
    const limpo = cleanName(s.name);
    if (s.name === s.name.toUpperCase() && limpo !== s.name) {
      svcsNeedsClean++;
      report += `| ${s.name} | **${limpo}** |\n`;
    }
  }
  if (svcsNeedsClean === 0) report += '| Todos os serviços parecem OK | - |\n';

  fs.writeFileSync('scratch/audit_report.md', report);
  console.log('Auditoria concluída! Relatório salvo em scratch/audit_report.md');
}

runAudit().catch(console.error);
