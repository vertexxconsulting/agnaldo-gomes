/**
 * CRON diário: feedback pós-atendimento.
 * Busca agendamentos CONCLUÍDOS (COMPLETED ou CONFIRMED) de ontem e anteontem
 * e envia mensagem pedindo avaliação do procedimento.
 *
 * TRAVA DE SEGURANÇA:
 * - Se chamado sem ?execute=true, opera em modo PREVIEW (apenas lista, NUNCA dispara).
 * - Quando execute=true, respeita as travas de ativação (feedback),
 *   horário programado, proteção anti-duplicação e intervalo mínimo de 1 minuto entre envios.
 */
import { NextResponse } from 'next/server';
import { autorizadoCron, hojeBRT, somarDias } from '@/lib/cron-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { msgFeedback, normalizarTelefone, waMeLink } from '@/lib/mensagens';
import { enviarTexto, evolutionConfigurada } from '@/lib/evolution';
import {
  getMarketingConfig, getDisparosHoje, registrarDisparoHoje,
  esperarIntervaloSeguro, horaAtualBRT, tentarObterLockDisparo, liberarLockDisparo,
} from '@/lib/marketing-control';

export async function GET(req: Request) {
  if (!(await autorizadoCron(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(req.url);
  const isVercelCron = Boolean(req.headers.get('x-vercel-cron'));
  const isExecute = url.searchParams.get('execute') === 'true' || isVercelCron;
  const force = url.searchParams.get('force') === 'true';

  const hoje = hojeBRT();
  const ontem = somarDias(hoje, -1);
  const anteontem = somarDias(hoje, -2);
  const horaAtual = horaAtualBRT();

  try {
    const supabase = await getSupabaseServiceClient();
    const config = await getMarketingConfig();
    const disparosHoje = await getDisparosHoje(hoje);

    const selectAg = `
      id, date, start_time,
      cliente:salon_customers(id, name, phone),
      servico:salon_services(id, name, category),
      profissional:salon_professionals(name)
    `;

    const { data: concluidos, error } = await supabase
      .from('salon_appointments')
      .select(selectAg)
      .in('date', [ontem, anteontem])
      .in('status', ['COMPLETED', 'CONFIRMED'])
      .order('date', { ascending: false });

    if (error) throw error;

    type AgendamentoJoin = {
      id: string;
      date: string;
      start_time: string;
      cliente?: { id?: string; name?: string; phone?: string } | { id?: string; name?: string; phone?: string }[] | null;
      servico?: { id?: string; name?: string; category?: string } | { id?: string; name?: string; category?: string }[] | null;
      profissional?: { name?: string } | { name?: string }[] | null;
    };

    const getCliente = (a: AgendamentoJoin) => {
      if (!a.cliente) return null;
      return Array.isArray(a.cliente) ? a.cliente[0] : a.cliente;
    };
    const getServico = (a: AgendamentoJoin) => {
      if (!a.servico) return null;
      return Array.isArray(a.servico) ? a.servico[0] : a.servico;
    };

    // FILTRO DE TIPOS DE SERVIÇO:
    // Se o filtro estiver configurado para 'selecionados', respeita os serviços e categorias permitidos
    const servicosPermitidos = config.feedback.servicos_permitidos ?? [];
    const categoriasPermitidas = config.feedback.categorias_permitidas ?? [];
    const filtrarPorServico = config.feedback.tipo_filtro === 'selecionados';

    const agendamentoElegivel = (a: AgendamentoJoin): boolean => {
      if (!filtrarPorServico) return true;
      const s = getServico(a);
      if (!s) return false;

      // Se nenhum serviço nem categoria estiver marcada no modo selecionados, não gera feedback
      if (servicosPermitidos.length === 0 && categoriasPermitidas.length === 0) {
        return false;
      }

      if (s.id && servicosPermitidos.includes(s.id)) return true;
      if (s.category && categoriasPermitidas.includes(s.category)) return true;

      return false;
    };

    // DEDUPLICAÇÃO POR CLIENTE: Garante que cada cliente receba NO MÁXIMO 1 pedido de feedback
    const agendamentoMaisRecentePorCliente = new Map<string, AgendamentoJoin>();
    for (const a of (concluidos ?? []) as unknown as AgendamentoJoin[]) {
      if (!agendamentoElegivel(a)) continue;
      const cliente = getCliente(a);
      const chaveCliente = cliente?.id || cliente?.phone || a.id;
      if (!agendamentoMaisRecentePorCliente.has(chaveCliente)) {
        agendamentoMaisRecentePorCliente.set(chaveCliente, a);
      }
    }

    const listaUnica = Array.from(agendamentoMaisRecentePorCliente.values());

    const itens = await Promise.all(listaUnica.map(async (a) => {
      const cliente = getCliente(a);
      const servico = getServico(a);
      const nomeProcedimento = servico?.name ?? 'seu atendimento';
      const telefone = normalizarTelefone(cliente?.phone ?? '');
      const msg = await msgFeedback({
        nome: cliente?.name ?? '',
        servico: nomeProcedimento,
      });
      const chaveUnica = `feedback:${cliente?.id || a.id}`;
      const jaEnviado = disparosHoje.has(chaveUnica);

      return {
        id: a.id,
        tipo: 'feedback',
        chaveUnica,
        nome: cliente?.name ?? null,
        telefone,
        servico: nomeProcedimento,
        data: a.date,
        mensagem: msg,
        wa_link: telefone ? waMeLink(telefone, msg) : '',
        ja_enviado_hoje: jaEnviado,
        enviada_via_api: jaEnviado,
      };
    }));

    // SE FOR PREVIEW / LEITURA, RETORNA IMEDIATAMENTE SEM DISPARAR
    if (!isExecute) {
      return NextResponse.json({
        ok: true,
        modo: 'preview',
        referencia: { hoje, ontem, anteontem },
        total: itens.length,
        evolution_conectada: evolutionConfigurada(),
        config_feedback: config.feedback,
        enviados_automaticos: 0,
        itens,
      });
    }

    // MODO EXECUÇÃO REAL COM DISPARO:
    if (!evolutionConfigurada()) {
      return NextResponse.json({ ok: false, error: 'Evolution API não configurada' }, { status: 400 });
    }

    // Tentar obter Lock
    if (!tentarObterLockDisparo()) {
      return NextResponse.json({
        ok: false,
        error: 'Já existe um ciclo de disparo em andamento no momento. Aguarde o término.',
      }, { status: 429 });
    }

    const falhas: { nome: string | null; error: string }[] = [];
    let enviadosAutomaticos = 0;

    try {
      for (const item of itens) {
        if (!item.telefone) continue;

        // TRAVA 1: Verificar se feedback está ativo
        if (!force && !config.feedback.ativo) continue;

        // TRAVA 2: Verificar horário programado
        if (!force && horaAtual < config.feedback.horario) continue;

        // TRAVA 3: Anti-Duplicação
        if (disparosHoje.has(item.chaveUnica)) continue;

        const r = await enviarTexto(item.telefone, item.mensagem);
        if (r.ok) {
          enviadosAutomaticos++;
          item.enviada_via_api = true;
          item.ja_enviado_hoje = true;
          await registrarDisparoHoje(item.chaveUnica, hoje);

          // TRAVA 4: Intervalo de pelo menos 1 minuto (60s)
          await esperarIntervaloSeguro(config.intervalo_segundos);
        } else {
          falhas.push({ nome: item.nome, error: r.error ?? '' });
        }
      }
    } finally {
      liberarLockDisparo();
    }

    return NextResponse.json({
      ok: true,
      modo: 'execute',
      referencia: { hoje, ontem, anteontem },
      total: itens.length,
      evolution_conectada: evolutionConfigurada(),
      enviados_automaticos: enviadosAutomaticos,
      falhas,
      itens,
    });
  } catch (error: any) {
    console.error('[cron/feedback]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
