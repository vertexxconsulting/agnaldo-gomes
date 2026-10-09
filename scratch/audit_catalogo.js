require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function cleanName(name) {
  if (!name) return name;
  let cleaned = name.trim();
  
  // Ex: "CONDIONADOR HIDRA AIR" -> "Condicionador Hidra Air" (Title Case)
  // Mas vamos focar na bagunça primeiro.
  // Remover sequencias de numeros como SKUs no final ou EANs perdidos, se houver
  cleaned = cleaned.replace(/\s*\d{6,}\s*$/, ''); // remove sequencias longas de numeros
  
  // Transformar para Title Case (primeira letra maiuscula)
  cleaned = cleaned.toLowerCase().replace(/(?:^|\s|-|\/)\S/g, function(a) { return a.toUpperCase(); });
  
  // Corrigir espaços extras
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

async function runAudit() {
  console.log('Buscando servicos...');
  const { data: servicos } = await supabase.from('salon_services').select('*');
  
  console.log('Buscando produtos...');
  const { data: produtos } = await supabase.from('inventory').select('*');

  let report = '# Auditoria de Catálogo (Produtos e Serviços)\n\n';

  // --- ANÁLISE DE PRODUTOS ---
  report += '## 📦 Auditoria de Produtos (Estoque)\n\n';
  report += '### Produtos com nomes bagunçados (Tudo maiúsculo, números estranhos, etc)\n';
  report += '| ID | Nome Atual | Nome Sugerido (Limpo) | Categoria |\n';
  report += '|---|---|---|---|\n';
  
  let prodsNeedsClean = 0;
  for (const p of (produtos || [])) {
    const limpo = cleanName(p.name);
    if (limpo !== p.name) {
      prodsNeedsClean++;
      report += `| ${p.id.split('-')[0]}... | ${p.name} | **${limpo}** | ${p.category} |\n`;
    }
  }
  if (prodsNeedsClean === 0) report += '| - | Nenhum problema encontrado | - | - |\n';

  // --- ANÁLISE DE SERVIÇOS ---
  report += '\n## 💇‍♀️ Auditoria de Serviços\n\n';
  
  // Identificar possíveis duplicatas (nomes muito parecidos com preços diferentes)
  // Agrupar por nomes normalizados (ex: ignorando acentos, tudo minusculo, removendo palavras como "curto", "longo")
  const svcMap = {};
  for (const s of (servicos || [])) {
    let baseName = s.name.toLowerCase()
      .replace(/[áàãâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
      .replace(/[óòõôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/[ç]/g, 'c')
      .replace(/\s*(curto|medio|longo|extra longo|\(.*\)|-.*)\s*$/i, '')
      .replace(/\s+/g, ' ').trim();

    if (!svcMap[baseName]) svcMap[baseName] = [];
    svcMap[baseName].push(s);
  }

  report += '### Serviços Suspeitos de Duplicação (Mesmo tipo, preços/tamanhos diferentes)\n';
  report += 'Estes serviços poderiam ter seus nomes padronizados (ex: "Escova - Curto", "Escova - Longo") ou até unidos se fizer sentido.\n\n';
  
  let dupCount = 0;
  for (const [base, items] of Object.entries(svcMap)) {
    if (items.length > 1) {
      dupCount++;
      report += `**Grupo Suspeito: "${base}"**\n`;
      for (const item of items) {
        report += `- ${item.name} (R$ ${item.price})\n`;
      }
      report += '\n';
    }
  }

  if (dupCount === 0) report += '*Nenhum agrupamento suspeito encontrado.*\n';

  report += '### Serviços com nomes que precisam de formatação (Limpeza)\n';
  report += '| ID | Nome Atual | Nome Sugerido (Limpo) | Preço |\n';
  report += '|---|---|---|---|\n';
  
  let svcsNeedsClean = 0;
  for (const s of (servicos || [])) {
    const limpo = cleanName(s.name);
    if (limpo !== s.name) {
      svcsNeedsClean++;
      report += `| ${s.id.split('-')[0]}... | ${s.name} | **${limpo}** | R$ ${s.price} |\n`;
    }
  }
  if (svcsNeedsClean === 0) report += '| - | Nenhum problema encontrado | - | - |\n';

  fs.writeFileSync('scratch/audit_report.md', report);
  console.log('Auditoria concluída! Relatório salvo em scratch/audit_report.md');
}

runAudit();
