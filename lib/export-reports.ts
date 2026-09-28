import { jsPDF } from 'jspdf';
import type { ReportData } from './reports';

/**
 * Exporta o relatório completo em formato PDF estilizado com padrão visual premium.
 */
export function exportarRelatorioPDF(data: ReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  // Cores da Identidade Visual
  const corDourado = [212, 175, 55]; // #D4AF37
  const corEscuro = [15, 23, 42];   // #0F172A
  const corCinza = [100, 116, 139]; // #64748B
  const corLinha = [226, 232, 240];

  // 1. Cabeçalho
  doc.setFillColor(corEscuro[0], corEscuro[1], corEscuro[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(corDourado[0], corDourado[1], corDourado[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('STUDIO & ACADEMY AGNALDO GOMES', margin, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Relatório Estratégico de Gestão | ${data.tituloPeriodo}`, margin, 18);

  const agora = new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  doc.text(`Emitido em: ${agora}`, pageWidth - margin, 18, { align: 'right' });

  y = 36;

  // 2. Quadro de KPIs Principais
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(corEscuro[0], corEscuro[1], corEscuro[2]);
  doc.text('RESUMO EXECUTIVO DO PERÍODO', margin, y);
  y += 5;

  const cardWidth = (pageWidth - (margin * 2) - 9) / 4;
  const cardHeight = 18;

  const kpis = [
    { label: 'FATURAMENTO', val: `R$ ${data.faturamentoBruto.toFixed(2)}`, color: [16, 185, 129] },
    { label: 'ATENDIMENTOS', val: String(data.totalAtendimentos), color: [59, 130, 246] },
    { label: 'TICKET MÉDIO', val: `R$ ${data.ticketMedio.toFixed(2)}`, color: corDourado },
    { label: 'CANCELAMENTOS', val: String(data.totalCancelamentos), color: [239, 68, 68] },
  ];

  kpis.forEach((kpi, idx) => {
    const cx = margin + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(corLinha[0], corLinha[1], corLinha[2]);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.text(kpi.label, cx + 3, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, cx + 3, y + 13);
  });

  y += cardHeight + 10;

  // 3. Performance Profissional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(corEscuro[0], corEscuro[1], corEscuro[2]);
  doc.text('PERFORMANCE POR PROFISSIONAL', margin, y);
  y += 4;

  // Tabela Profissionais Cabeçalho
  doc.setFillColor(corEscuro[0], corEscuro[1], corEscuro[2]);
  doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('PROFISSIONAL', margin + 3, y + 4.2);
  doc.text('ATENDIMENTOS', margin + 90, y + 4.2);
  doc.text('FATURAMENTO (R$)', pageWidth - margin - 3, y + 4.2, { align: 'right' });
  y += 6;

  if (data.performanceProfissionais.length === 0) {
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Nenhum atendimento realizado por profissionais no período.', margin + 3, y + 5);
    y += 8;
  } else {
    data.performanceProfissionais.forEach((p, idx) => {
      const bg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(p.nome, margin + 3, y + 4.2);
      doc.text(String(p.atendimentos), margin + 90, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${p.faturamento.toFixed(2)}`, pageWidth - margin - 3, y + 4.2, { align: 'right' });
      y += 6;
    });
  }

  y += 8;

  // 4. Distribuição dos Principais Serviços
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(corEscuro[0], corEscuro[1], corEscuro[2]);
  doc.text('SERVIÇOS REALIZADOS', margin, y);
  y += 4;

  doc.setFillColor(corEscuro[0], corEscuro[1], corEscuro[2]);
  doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('SERVIÇO', margin + 3, y + 4.2);
  doc.text('QTD', margin + 90, y + 4.2);
  doc.text('% TOTAL', margin + 120, y + 4.2);
  doc.text('SUBTOTAL (R$)', pageWidth - margin - 3, y + 4.2, { align: 'right' });
  y += 6;

  if (data.servicosMaisProcurados.length === 0) {
    doc.setTextColor(corCinza[0], corCinza[1], corCinza[2]);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Nenhum serviço realizado no período.', margin + 3, y + 5);
    y += 8;
  } else {
    data.servicosMaisProcurados.forEach((s, idx) => {
      const bg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(s.nome, margin + 3, y + 4.2);
      doc.text(String(s.quantidade), margin + 90, y + 4.2);
      doc.text(`${s.porcentagem}%`, margin + 120, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${s.faturamento.toFixed(2)}`, pageWidth - margin - 3, y + 4.2, { align: 'right' });
      y += 6;
    });
  }

  y += 8;

  // 5. Lista de Atendimentos Detalhada (com quebra de página se necessário)
  const checarQuebraPagina = (espacoNecessario: number) => {
    if (y + espacoNecessario > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      // Cabeçalho resumido na nova página
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(corDourado[0], corDourado[1], corDourado[2]);
      doc.text(`STUDIO AGNALDO GOMES — DETALHAMENTO DE ATENDIMENTOS (CONT.)`, margin, y);
      y += 6;

      doc.setFillColor(corEscuro[0], corEscuro[1], corEscuro[2]);
      doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text('DATA/HORA', margin + 3, y + 4.2);
      doc.text('CLIENTE', margin + 32, y + 4.2);
      doc.text('SERVIÇO', margin + 80, y + 4.2);
      doc.text('PROFISSIONAL', margin + 130, y + 4.2);
      doc.text('VALOR', pageWidth - margin - 3, y + 4.2, { align: 'right' });
      y += 6;
    }
  };

  checarQuebraPagina(20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(corEscuro[0], corEscuro[1], corEscuro[2]);
  doc.text(`HISTÓRICO INDIVIDUAL DOS ATENDIMENTOS (${data.itensDetalhados.length})`, margin, y);
  y += 4;

  doc.setFillColor(corEscuro[0], corEscuro[1], corEscuro[2]);
  doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('DATA/HORA', margin + 3, y + 4.2);
  doc.text('CLIENTE', margin + 32, y + 4.2);
  doc.text('SERVIÇO', margin + 80, y + 4.2);
  doc.text('PROFISSIONAL', margin + 130, y + 4.2);
  doc.text('VALOR', pageWidth - margin - 3, y + 4.2, { align: 'right' });
  y += 6;

  data.itensDetalhados.forEach((item, idx) => {
    checarQuebraPagina(6);
    const bg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bg, bg, bg);
    doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');

    const [ano, mes, dia] = item.data.split('-');
    const dtHora = `${dia}/${mes} ${item.hora}`;

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(dtHora, margin + 3, y + 4.2);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(item.clienteNome.slice(0, 25), margin + 32, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text(item.servicoNome.slice(0, 28), margin + 80, y + 4.2);
    doc.text(item.profissionalNome.slice(0, 20), margin + 130, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${item.valor.toFixed(2)}`, pageWidth - margin - 3, y + 4.2, { align: 'right' });
    y += 6;
  });

  // Salvar PDF
  const nomeArquivo = `Relatorio_Agnaldo_Gomes_${data.tituloPeriodo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(nomeArquivo);
}

/**
 * Exporta o resumo do relatório em formato SVG vetorial em alta resolução.
 */
export function exportarRelatorioSVG(data: ReportData) {
  const width = 1000;
  const height = 750;

  const agora = new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  // Montar barras dos profissionais em SVG
  const maxFaturamento = Math.max(...data.performanceProfissionais.map(p => p.faturamento), 1);
  const barrasProf = data.performanceProfissionais.map((p, i) => {
    const barWidth = Math.max((p.faturamento / maxFaturamento) * 350, 10);
    const yPos = 360 + (i * 45);
    return `
      <g>
        <text x="50" y="${yPos + 18}" fill="#e2e8f0" font-size="14" font-family="sans-serif" font-weight="600">${p.nome}</text>
        <rect x="220" y="${yPos}" width="${barWidth}" height="24" rx="4" fill="#D4AF37" />
        <text x="${230 + barWidth}" y="${yPos + 17}" fill="#D4AF37" font-size="13" font-family="sans-serif" font-weight="bold">R$ ${p.faturamento.toFixed(2)} (${p.atendimentos} atend.)</text>
      </g>
    `;
  }).join('');

  // Montar tabela de serviços em SVG
  const linhasServicos = data.servicosMaisProcurados.slice(0, 6).map((s, i) => {
    const yPos = 360 + (i * 40);
    return `
      <g>
        <text x="580" y="${yPos + 15}" fill="#f8fafc" font-size="13" font-family="sans-serif">${s.nome}</text>
        <text x="820" y="${yPos + 15}" fill="#94a3b8" font-size="13" font-family="sans-serif" text-anchor="middle">${s.quantidade} (${s.porcentagem}%)</text>
        <text x="940" y="${yPos + 15}" fill="#D4AF37" font-size="13" font-family="sans-serif" font-weight="bold" text-anchor="end">R$ ${s.faturamento.toFixed(2)}</text>
        <line x1="580" y1="${yPos + 26}" x2="940" y2="${yPos + 26}" stroke="#334155" stroke-dasharray="2 2" />
      </g>
    `;
  }).join('');

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
  </defs>

  <!-- Fundo Escuro Glass -->
  <rect width="${width}" height="${height}" rx="16" fill="url(#bgGrad)" stroke="#1e293b" stroke-width="2"/>

  <!-- Topo Header -->
  <rect x="0" y="0" width="${width}" height="100" rx="16" fill="#0f172a" />
  <rect x="0" y="96" width="${width}" height="4" fill="url(#goldGrad)" />
  
  <text x="50" y="45" fill="#D4AF37" font-size="20" font-family="sans-serif" font-weight="900" letter-spacing="1">STUDIO &amp; ACADEMY AGNALDO GOMES</text>
  <text x="50" y="75" fill="#f8fafc" font-size="14" font-family="sans-serif" font-weight="500">Relatório Executivo de Gestão — ${data.tituloPeriodo}</text>
  <text x="950" y="55" fill="#94a3b8" font-size="12" font-family="sans-serif" text-anchor="end">Emitido em: ${agora}</text>

  <!-- 4 Cards de KPIs -->
  <!-- Card 1: Faturamento -->
  <g transform="translate(50, 130)">
    <rect width="205" height="110" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <text x="20" y="32" fill="#94a3b8" font-size="11" font-family="sans-serif" font-weight="bold" letter-spacing="1">FATURAMENTO BRUTO</text>
    <text x="20" y="75" fill="#D4AF37" font-size="24" font-family="sans-serif" font-weight="900">R$ ${data.faturamentoBruto.toFixed(2)}</text>
    <text x="20" y="96" fill="#10B981" font-size="11" font-family="sans-serif">● Total apurado no período</text>
  </g>

  <!-- Card 2: Atendimentos -->
  <g transform="translate(280, 130)">
    <rect width="205" height="110" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <text x="20" y="32" fill="#94a3b8" font-size="11" font-family="sans-serif" font-weight="bold" letter-spacing="1">ATENDIMENTOS</text>
    <text x="20" y="75" fill="#f8fafc" font-size="26" font-family="sans-serif" font-weight="900">${data.totalAtendimentos}</text>
    <text x="20" y="96" fill="#38bdf8" font-size="11" font-family="sans-serif">● Clientes atendidos</text>
  </g>

  <!-- Card 3: Ticket Médio -->
  <g transform="translate(510, 130)">
    <rect width="205" height="110" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <text x="20" y="32" fill="#94a3b8" font-size="11" font-family="sans-serif" font-weight="bold" letter-spacing="1">TICKET MÉDIO</text>
    <text x="20" y="75" fill="#f59e0b" font-size="24" font-family="sans-serif" font-weight="900">R$ ${data.ticketMedio.toFixed(2)}</text>
    <text x="20" y="96" fill="#fbbf24" font-size="11" font-family="sans-serif">● Média por cliente</text>
  </g>

  <!-- Card 4: Cancelamentos -->
  <g transform="translate(740, 130)">
    <rect width="210" height="110" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <text x="20" y="32" fill="#94a3b8" font-size="11" font-family="sans-serif" font-weight="bold" letter-spacing="1">CANCELAMENTOS</text>
    <text x="20" y="75" fill="#ef4444" font-size="26" font-family="sans-serif" font-weight="900">${data.totalCancelamentos}</text>
    <text x="20" y="96" fill="#f87171" font-size="11" font-family="sans-serif">● Cancelamentos / No-show</text>
  </g>

  <!-- Seção 1: Performance Profissionais -->
  <g transform="translate(0, 270)">
    <rect x="50" y="0" width="460" height="420" rx="12" fill="#111827" stroke="#1f2937"/>
    <text x="75" y="40" fill="#D4AF37" font-size="14" font-family="sans-serif" font-weight="bold" letter-spacing="1">PERFORMANCE PROFISSIONAL</text>
    <line x1="75" y1="55" x2="485" y2="55" stroke="#374151"/>
    ${barrasProf || '<text x="75" y="100" fill="#64748b" font-size="13" font-family="sans-serif">Sem atendimentos registrados</text>'}
  </g>

  <!-- Seção 2: Serviços Realizados -->
  <g transform="translate(0, 270)">
    <rect x="540" y="0" width="410" height="420" rx="12" fill="#111827" stroke="#1f2937"/>
    <text x="565" y="40" fill="#D4AF37" font-size="14" font-family="sans-serif" font-weight="bold" letter-spacing="1">DISTRIBUIÇÃO DE SERVIÇOS</text>
    <line x1="565" y1="55" x2="925" y2="55" stroke="#374151"/>
    ${linhasServicos || '<text x="565" y="100" fill="#64748b" font-size="13" font-family="sans-serif">Sem serviços no período</text>'}
  </g>

  <!-- Rodapé -->
  <text x="500" y="725" fill="#475569" font-size="11" font-family="sans-serif" text-anchor="middle">Plataforma Studio Agnaldo Gomes — Gestão &amp; Academy | Desenvolvido por Vertex Consulting</text>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Relatorio_Agnaldo_Gomes_${data.tituloPeriodo.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
