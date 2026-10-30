/**
 * CRON diário: confirmações de agendamento (véspera) e lembretes (mesmo dia).
 * - Amanhã: mensagem de confirmação (véspera)
 * - Hoje: lembrete de mesmo dia
 *
 * TRAVA DE SEGURANÇA:
 * - Se chamado sem ?execute=true, opera em modo PREVIEW (apenas lista, NUNCA dispara).
 * - Quando execute=true, respeita as travas de ativação (agenda_confirmacao / agenda_lembrete),
 *   horário programado, proteção anti-duplicação e intervalo mínimo de 1 minuto entre envios.
 */
import { NextResponse } from 'next/server';
import { autorizadoCron, hojeBRT } from '@/lib/cron-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import {
  msgConfirmacaoVespera, msgLembreteMesmoDia,
  normalizarTelefone, waMeLink,
} from '@/lib/mensagens';
import { enviarTexto, evolutionConfigurada } from '@/lib/evolution';
import {
  getMarketingConfig, getDisparosHoje, registrarDisparoHoje,
  esperarIntervaloSeguro, horaAtualBRT, tentarObterLockDisparo, liberarLockDisparo,
} from '@/lib/marketing-control';

function adicionarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

type Agendamento = {
  id: string;
  date: string;
  start_time: string;
  cliente?: { id?: string; name?: string; phone?: string } | null;
  servico?: { name?: string } | null;
  profissional?: { name?: string } | null;
};

export async function GET(req: Request) {
  if (!(await autorizadoCron(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(req.url);
  const isVercelCron = Boolean(req.headers.get('x-vercel-cron'));
  const isExecute = url.searchParams.get('execute') === 'true' || isVercelCron;
  const force = url.searchParams.get('force') === 'true';

  const hoje = hojeBRT();
  const amanha = adicionarDias(hoje, 1);
  const horaAtual = horaAtualBRT();

  try {
    const supabase = await getSupabaseServiceClient();
    const config = await getMarketingConfig();
    const disparosHoje = await getDisparosHoje(hoje);

    // Agendamentos ativos de amanhã e hoje
    const selectAg = `
      id, date, start_time,
      cliente:salon_customers(id, name, phone),
      servico:salon_services(name),
      profissional:salon_professionals(name)
    `;

    type AgendamentoJoin = Agendamento & {
      cliente?: { id?: string; name?: string; phone?: string } | null;
    };

    const [vesperaRes, hojeRes] = await Promise.all([
      supabase.from('salon_appointments').select(selectAg).eq('date', amanha).in('status', ['PENDING', 'CONFIRMED']),
      supabase.from('salon_appointments').select(selectAg).eq('date', hoje).in('status', ['PENDING', 'CONFIRMED']),
    ]);

    if (vesperaRes.error) throw vesperaRes.error;
    if (hojeRes.error) throw hojeRes.error;

    type ItemMsg = {
      id: string;
      tipo: 'confirmacao_vespera' | 'lembrete_hoje';
      chaveUnica: string;
      nome: string | null;
      telefone: string;
      mensagem: string;
      wa_link: string;
      ja_enviado_hoje: boolean;
      enviada_via_api: boolean;
    };

    const itens: ItemMsg[] = [];

    // Véspera (Deduplica por cliente para não enviar 2 mensagens caso a cliente tenha mais de 1 agendamento amanhã)
    const vesperaPorCliente = new Map<string, AgendamentoJoin>();
    for (const a of (vesperaRes.data ?? []) as unknown as AgendamentoJoin[]) {
      const chaveCliente = a.cliente?.id || a.cliente?.phone || a.id;
      if (!vesperaPorCliente.has(chaveCliente)) {
        vesperaPorCliente.set(chaveCliente, a);
      }
    }

    for (const a of Array.from(vesperaPorCliente.values())) {
      const telefone = normalizarTelefone(a.cliente?.phone ?? '');
      const chaveUnica = `confirmacao:${a.cliente?.id || a.id}`;
      const msg = await msgConfirmacaoVespera({
        nome: a.cliente?.name ?? '',
        data: a.date,
        hora: (a.start_time ?? '').slice(0, 5),
        servico: a.servico?.name ?? 'seu atendimento',
        profissional: a.profissional?.name ?? 'nossa equipe',
      });

      itens.push({
        id: a.id,
        tipo: 'confirmacao_vespera',
        chaveUnica,
        nome: a.cliente?.name ?? null,
        telefone,
        mensagem: msg,
        wa_link: telefone ? waMeLink(telefone, msg) : '',
        ja_enviado_hoje: disparosHoje.has(chaveUnica),
        enviada_via_api: disparosHoje.has(chaveUnica),
      });
    }

    // Mesmo dia (Deduplica por cliente)
    const hojePorCliente = new Map<string, AgendamentoJoin>();
    for (const a of (hojeRes.data ?? []) as unknown as AgendamentoJoin[]) {
      const chaveCliente = a.cliente?.id || a.cliente?.phone || a.id;
      if (!hojePorCliente.has(chaveCliente)) {
        hojePorCliente.set(chaveCliente, a);
      }
    }

    for (const a of Array.from(hojePorCliente.values())) {
      const telefone = normalizarTelefone(a.cliente?.phone ?? '');
      const chaveUnica = `lembrete:${a.cliente?.id || a.id}`;
      const msg = await msgLembreteMesmoDia({
        nome: a.cliente?.name ?? '',
        hora: (a.start_time ?? '').slice(0, 5),
        servico: a.servico?.name ?? 'seu atendimento',
      });

      itens.push({
        id: a.id,
        tipo: 'lembrete_hoje',
        chaveUnica,
        nome: a.cliente?.name ?? null,
        telefone,
        mensagem: msg,
        wa_link: telefone ? waMeLink(telefone, msg) : '',
        ja_enviado_hoje: disparosHoje.has(chaveUnica),
        enviada_via_api: disparosHoje.has(chaveUnica),
      });
    }

    // SE FOR APENAS VISUALIZAÇÃO / PREVIEW, RETORNA IMEDIATAMENTE SEM DISPARAR
    if (!isExecute) {
      return NextResponse.json({
        ok: true,
        modo: 'preview',
        referencia: { hoje, amanha },
        total: itens.length,
        evolution_conectada: evolutionConfigurada(),
        config_agenda_confirmacao: config.agenda_confirmacao,
        config_agenda_lembrete: config.agenda_lembrete,
        enviados_automaticos: 0,
        itens,
      });
    }

    // MODO EXECUÇÃO REAL COM DISPARO:
    if (!evolutionConfigurada()) {
      return NextResponse.json({ ok: false, error: 'Evolution API não configurada' }, { status: 400 });
    }

    // Tentar obter Lock para não concorrer com outro disparo
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

        // TRAVA 1: Verificar se a sessão específica está ativa nas configurações
        if (!force) {
          if (item.tipo === 'confirmacao_vespera' && !config.agenda_confirmacao.ativo) continue;
          if (item.tipo === 'lembrete_hoje' && !config.agenda_lembrete.ativo) continue;

          // TRAVA 2: Verificar horário programado da sessão
          if (item.tipo === 'confirmacao_vespera' && horaAtual < config.agenda_confirmacao.horario) continue;
          if (item.tipo === 'lembrete_hoje' && horaAtual < config.agenda_lembrete.horario) continue;
        }

        // TRAVA 3: Anti-Duplicação (NÃO reenvia se já foi enviado hoje)
        if (disparosHoje.has(item.chaveUnica)) {
          continue;
        }

        // Enviar mensagem
        const r = await enviarTexto(item.telefone, item.mensagem);
        if (r.ok) {
          enviadosAutomaticos++;
          item.enviada_via_api = true;
          item.ja_enviado_hoje = true;
          await registrarDisparoHoje(item.chaveUnica, hoje);

          // TRAVA 4: Intervalo de pelo menos 1 minuto (60s) entre cada disparo
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
      referencia: { hoje, amanha },
      total: itens.length,
      evolution_conectada: evolutionConfigurada(),
      enviados_automaticos: enviadosAutomaticos,
      falhas,
      itens,
    });
  } catch (error: any) {
    console.error('[cron/agenda]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
