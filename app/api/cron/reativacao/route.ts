/**
 * CRON: reengajamento de clientes inativos há 90+ dias.
 *
 * TRAVA DE SEGURANÇA:
 * - Se chamado sem ?execute=true, opera em modo PREVIEW (apenas lista, NUNCA dispara).
 * - Quando execute=true, respeita as travas de ativação (reativacao),
 *   horário programado, proteção anti-duplicação e intervalo mínimo de 1 minuto entre envios.
 */
import { NextResponse } from 'next/server';
import { autorizadoCron, hojeBRT } from '@/lib/cron-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { msgReativacao, normalizarTelefone, waMeLink } from '@/lib/mensagens';
import { enviarTexto, evolutionConfigurada } from '@/lib/evolution';
import {
  getMarketingConfig, getDisparosHoje, registrarDisparoHoje,
  esperarIntervaloSeguro, horaAtualBRT, tentarObterLockDisparo, liberarLockDisparo,
} from '@/lib/marketing-control';

const DIAS_INATIVO = 90;

export async function GET(req: Request) {
  if (!(await autorizadoCron(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(req.url);
  const isVercelCron = Boolean(req.headers.get('x-vercel-cron'));
  const isExecute = url.searchParams.get('execute') === 'true' || isVercelCron;
  const force = url.searchParams.get('force') === 'true';

  const hoje = hojeBRT();
  const corteData = new Date(`${hoje}T12:00:00`);
  corteData.setDate(corteData.getDate() - DIAS_INATIVO);
  const corteISO = corteData.toISOString().slice(0, 10);
  const horaAtual = horaAtualBRT();

  try {
    const supabase = await getSupabaseServiceClient();
    const config = await getMarketingConfig();
    const disparosHoje = await getDisparosHoje(hoje);

    // 1. Todos os clientes com telefone
    const { data: clientes, error: errClientes } = await supabase
      .from('salon_customers')
      .select('id, name, phone')
      .not('phone', 'is', null);

    if (errClientes) throw errClientes;

    // 2. Último agendamento CONCLUÍDO de cada cliente
    const { data: agendamentos, error: errAgs } = await supabase
      .from('salon_appointments')
      .select('customer_id, date, status')
      .eq('status', 'COMPLETED')
      .order('date', { ascending: false });

    if (errAgs) throw errAgs;

    const ultimaConclusaoPorCliente = new Map<string, string>();
    for (const a of (agendamentos ?? []) as any[]) {
      if (!a.customer_id) continue;
      if (!ultimaConclusaoPorCliente.has(a.customer_id)) {
        ultimaConclusaoPorCliente.set(a.customer_id, a.date);
      }
    }

    // 3. Filtrar clientes inativos: apenas quem REALMENTE já teve agendamento CONCLUÍDO e já passou de 90 dias
    const inativos = (clientes ?? []).filter(c => {
      const ultima = ultimaConclusaoPorCliente.get(c.id);
      if (!ultima) return false; // Ignora quem nunca teve atendimento concluído no sistema
      return ultima < corteISO;
    });

    // 4. Montar mensagens
    const itens = await Promise.all(inativos.map(async c => {
      const ultima = ultimaConclusaoPorCliente.get(c.id)!;
      const diff = new Date(`${hoje}T12:00:00`).getTime() - new Date(`${ultima}T12:00:00`).getTime();
      const dias = Math.floor(diff / (24 * 3600 * 1000));
      const msg = await msgReativacao(c.name ?? '', dias);
      const telefone = normalizarTelefone(c.phone ?? '');
      const chaveUnica = `reativacao:${c.id}`;
      const jaEnviado = disparosHoje.has(chaveUnica);

      return {
        id: c.id,
        tipo: 'reativacao',
        chaveUnica,
        nome: c.name,
        telefone,
        diasDesdeUltima: dias,
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
        dia: hoje,
        total: itens.length,
        evolution_conectada: evolutionConfigurada(),
        config_reativacao: config.reativacao,
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

    const falhas: { nome: string; error: string }[] = [];
    let enviadosAutomaticos = 0;

    try {
      for (const item of itens) {
        if (!item.telefone) continue;

        // TRAVA 1: Verificar se reativação está ativa
        if (!force && !config.reativacao.ativo) continue;

        // TRAVA 2: Verificar horário programado
        if (!force && horaAtual < config.reativacao.horario) continue;

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
          falhas.push({ nome: item.nome ?? '', error: r.error ?? '' });
        }
      }
    } finally {
      liberarLockDisparo();
    }

    return NextResponse.json({
      ok: true,
      modo: 'execute',
      dia: hoje,
      total: itens.length,
      evolution_conectada: evolutionConfigurada(),
      enviados_automaticos: enviadosAutomaticos,
      falhas,
      itens,
    });
  } catch (error: any) {
    console.error('[cron/reativacao]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
