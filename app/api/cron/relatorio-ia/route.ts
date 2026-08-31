import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { enviarRelatorioExecutivoBolten } from '@/lib/bolten';

export const dynamic = 'force-dynamic';

async function processarEnvioRelatorio(telefoneManual?: string) {
  const agora = new Date();
  const hoje = agora.toISOString().split('T')[0];
  const [ano, mes, dia] = hoje.split('-');
  const periodoFormatado = `${dia}/${mes}/${ano}`;

  const supabase = await getSupabaseServiceClient();

  // 1. Buscar agendamentos do dia
  const { data: agendamentos, error: errAgendamentos } = await supabase
    .from('salon_appointments')
    .select(`
      id,
      date,
      start_time,
      status,
      service:salon_services(id, name, price, category),
      professional:salon_professionals(id, name),
      customer:salon_customers(id, name, phone)
    `)
    .eq('date', hoje);

  if (errAgendamentos) {
    console.error('[cron/relatorio-ia] Erro ao buscar agendamentos:', errAgendamentos);
    throw new Error(errAgendamentos.message);
  }

  const lista = agendamentos || [];
  const concluidos = lista.filter((a: any) => a.status === 'CONFIRMED' || a.status === 'COMPLETED' || a.status === 'IN_PROGRESS');
  const cancelados = lista.filter((a: any) => a.status === 'CANCELLED' || a.status === 'NO_SHOW');

  // 2. Faturamento e estatísticas
  let faturamento = 0;
  const servicosMap: Record<string, number> = {};
  const profMap: Record<string, number> = {};

  concluidos.forEach((a: any) => {
    const preco = Number(a.service?.price || 0);
    faturamento += preco;

    const sNome = a.service?.name || 'Geral';
    servicosMap[sNome] = (servicosMap[sNome] || 0) + 1;

    const pNome = a.professional?.name || 'Equipe';
    profMap[pNome] = (profMap[pNome] || 0) + preco;
  });

  const ticketMedio = concluidos.length > 0 ? Math.round(faturamento / concluidos.length) : 0;

  const servicosDestaque = Object.entries(servicosMap)
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const profissionaisDestaque = Object.entries(profMap)
    .map(([nome, fat]) => ({ nome, faturamento: fat }))
    .sort((a, b) => b.faturamento - a.faturamento);

  const telDestino = telefoneManual || process.env.WHATSAPP_AGNALDO || '5542991534011';

  // 3. Montar texto executivo de IA
  const resumoTexto = `📊 *STUDIO AGNALDO GOMES — RELATÓRIO DO DIA (${periodoFormatado})*
Olá Mestre Agnaldo Gomes! Segue o balanço automático consolidado de hoje:

💰 *Faturamento:* R$ ${faturamento.toFixed(2)}
👥 *Atendimentos:* ${concluidos.length} cliente(s)
📈 *Ticket Médio:* R$ ${ticketMedio.toFixed(2)}
⚠️ *Cancelamentos:* ${cancelados.length}

✂️ *Serviços em Destaque:*
${servicosDestaque.slice(0, 3).map(s => `• ${s.nome} (${s.quantidade}x)`).join('\n') || '• Nenhum serviço realizado hoje'}

👑 *Profissionais:*
${profissionaisDestaque.map(p => `• ${p.nome}: R$ ${p.faturamento.toFixed(2)}`).join('\n') || '• Sem faturamento registrado'}

💡 *Disparo automático programado via Bolten.io CRM.*`;

  // 4. Disparar via Bolten CRM
  const resBolten = await enviarRelatorioExecutivoBolten({
    telefoneDestino: telDestino,
    nomeDestino: 'Agnaldo Gomes',
    periodo: periodoFormatado,
    faturamentoBruto: faturamento,
    totalAtendimentos: concluidos.length,
    ticketMedio,
    totalCancelamentos: cancelados.length,
    servicosDestaque,
    profissionaisDestaque,
    resumoTexto,
  });

  return {
    sucesso: true,
    data: hoje,
    destino: telDestino,
    faturamento,
    atendimentos: concluidos.length,
    boltenResultado: resBolten,
    resumoTexto,
  };
}

// Handler GET para acionamento via Vercel Cron
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    // Em produção na Vercel, cron requests incluem CRON_SECRET se configurado
    const resultado = await processarEnvioRelatorio();
    return NextResponse.json(resultado);
  } catch (err: any) {
    console.error('[cron/relatorio-ia] Falha na execução do Cron:', err);
    return NextResponse.json({ sucesso: false, error: err?.message || 'Erro no Cron' }, { status: 500 });
  }
}

// Handler POST para disparo manual imediato pelo painel
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const resultado = await processarEnvioRelatorio(body.telefone);
    return NextResponse.json(resultado);
  } catch (err: any) {
    console.error('[cron/relatorio-ia] Falha no disparo manual:', err);
    return NextResponse.json({ sucesso: false, error: err?.message || 'Erro no disparo' }, { status: 500 });
  }
}
