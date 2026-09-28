import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { enviarRelatorioExecutivoBolten } from '@/lib/bolten';

export const dynamic = 'force-dynamic';

// Retorna os dias de início de semana (Domingo=0) do período
function periodoSemanaAtual(): { inicio: string; fim: string } {
  const agora = new Date();
  const diaSemana = agora.getDay(); // 0 = Dom
  const inicioSemana = new Date(agora);
  inicioSemana.setDate(agora.getDate() - diaSemana);
  const fimSemana = new Date(agora);
  fimSemana.setDate(agora.getDate() + (6 - diaSemana));
  return {
    inicio: inicioSemana.toISOString().split('T')[0],
    fim: fimSemana.toISOString().split('T')[0],
  };
}

function periodoMesAtual(): { inicio: string; fim: string } {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0];
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().split('T')[0];
  return { inicio, fim };
}

async function carregarConfigRelatorio(supabase: any) {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'relatorio_ia')
      .single();

    if (data?.value) return data.value;
  } catch {}

  return {
    frequencia: 'diario',
    diaSemana: 0,
    horarioEnvio: '20:00',
    whatsappAgnaldo: '5542991534011',
    ativo: true,
  };
}

async function processarEnvioRelatorio(supabase: any, opts: { telefoneManual?: string; forcado?: boolean }) {
  const agora = new Date();
  const config = await carregarConfigRelatorio(supabase);

  // ── Verificação de Frequência (skip se não for o dia certo) ──
  if (!opts.forcado) {
    if (!config.ativo) {
      return { sucesso: false, pulado: true, motivo: 'Envio automático desativado nas configurações.' };
    }

    const diaSemanaHoje = agora.getDay(); // 0 = Dom, 1 = Seg, ...
    const diaDoMes = agora.getDate();

    if (config.frequencia === 'semanal') {
      const diaEscolhido = Number(config.diaSemana ?? 0);
      if (diaSemanaHoje !== diaEscolhido) {
        return {
          sucesso: false,
          pulado: true,
          motivo: `Frequência semanal: hoje é dia ${diaSemanaHoje}, envio programado para dia ${diaEscolhido} da semana. Pulando.`,
        };
      }
    }

    if (config.frequencia === 'mensal') {
      if (diaDoMes !== 1) {
        return {
          sucesso: false,
          pulado: true,
          motivo: `Frequência mensal: hoje é dia ${diaDoMes}, envio programado apenas para o dia 1. Pulando.`,
        };
      }
    }
  }

  // ── Determinar período de consulta ──
  let periodoInicio: string;
  let periodoFim: string;
  let periodoLabel: string;

  if (config.frequencia === 'semanal') {
    const { inicio, fim } = periodoSemanaAtual();
    periodoInicio = inicio;
    periodoFim = fim;
    periodoLabel = `Semana de ${inicio.split('-').reverse().join('/')} a ${fim.split('-').reverse().join('/')}`;
  } else if (config.frequencia === 'mensal') {
    const { inicio, fim } = periodoMesAtual();
    periodoInicio = inicio;
    periodoFim = fim;
    const mesNome = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    periodoLabel = `Mês de ${mesNome}`;
  } else {
    // Diário
    const hoje = agora.toISOString().split('T')[0];
    periodoInicio = hoje;
    periodoFim = hoje;
    const [a, m, d] = hoje.split('-');
    periodoLabel = `Dia ${d}/${m}/${a}`;
  }

  // ── Buscar Agendamentos do Período ──
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
    .gte('date', periodoInicio)
    .lte('date', periodoFim);

  if (errAgendamentos) {
    throw new Error(errAgendamentos.message);
  }

  const lista = agendamentos || [];
  const concluidos = lista.filter(
    (a: any) => a.status === 'CONFIRMED' || a.status === 'COMPLETED' || a.status === 'IN_PROGRESS'
  );
  const cancelados = lista.filter((a: any) => a.status === 'CANCELLED' || a.status === 'NO_SHOW');

  // ── Métricas ──
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

  const telDestino = opts.telefoneManual || config.whatsappAgnaldo || '5542991534011';

  const etiquetaFrequencia =
    config.frequencia === 'semanal' ? 'SEMANAL' :
    config.frequencia === 'mensal' ? 'MENSAL' : 'DIÁRIO';

  const resumoTexto = `📊 *STUDIO AGNALDO GOMES — RELATÓRIO ${etiquetaFrequencia}*
*Período: ${periodoLabel}*

Olá Mestre Agnaldo Gomes! Segue o balanço automático consolidado:

💰 *Faturamento:* R$ ${faturamento.toFixed(2)}
👥 *Atendimentos:* ${concluidos.length} cliente(s)
📈 *Ticket Médio:* R$ ${ticketMedio.toFixed(2)}
⚠️ *Cancelamentos:* ${cancelados.length}

✂️ *Serviços em Destaque:*
${servicosDestaque.slice(0, 3).map(s => `• ${s.nome} (${s.quantidade}x)`).join('\n') || '• Nenhum serviço no período'}

👑 *Profissionais:*
${profissionaisDestaque.map(p => `• ${p.nome}: R$ ${p.faturamento.toFixed(2)}`).join('\n') || '• Sem faturamento no período'}

💡 *Disparo automático via Bolten.io CRM — Frequência: ${etiquetaFrequencia}.*`;

  // ── Disparar via Bolten ──
  const resBolten = await enviarRelatorioExecutivoBolten({
    telefoneDestino: telDestino,
    nomeDestino: 'Agnaldo Gomes',
    periodo: periodoLabel,
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
    pulado: false,
    frequencia: config.frequencia,
    periodo: periodoLabel,
    destino: telDestino,
    faturamento,
    atendimentos: concluidos.length,
    boltenResultado: resBolten,
    resumoTexto,
  };
}

// GET – Vercel Cron (roda todo dia às 20h BRT = 23h UTC)
export async function GET() {
  try {
    const supabase = await getSupabaseServiceClient();
    const resultado = await processarEnvioRelatorio(supabase, { forcado: false });
    return NextResponse.json(resultado);
  } catch (err: any) {
    console.error('[cron/relatorio-ia] Falha no Cron:', err);
    return NextResponse.json({ sucesso: false, error: err?.message || 'Erro no Cron' }, { status: 500 });
  }
}

// POST – Disparo manual imediato pelo painel
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = await getSupabaseServiceClient();
    const resultado = await processarEnvioRelatorio(supabase, {
      telefoneManual: body.telefone,
      forcado: true, // ignora verificação de dia/frequência no disparo manual
    });
    return NextResponse.json(resultado);
  } catch (err: any) {
    console.error('[cron/relatorio-ia] Falha no disparo manual:', err);
    return NextResponse.json({ sucesso: false, error: err?.message || 'Erro no disparo' }, { status: 500 });
  }
}
