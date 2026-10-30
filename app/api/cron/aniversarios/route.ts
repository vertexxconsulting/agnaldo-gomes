/**
 * CRON diário: aniversariantes do dia.
 *
 * TRAVA DE SEGURANÇA:
 * - Se chamado sem ?execute=true, opera em modo PREVIEW (apenas lista, NUNCA dispara).
 * - Quando execute=true, respeita as travas de ativação (aniversarios),
 *   horário programado, proteção anti-duplicação e intervalo mínimo de 1 minuto entre envios.
 */
import { NextResponse } from 'next/server';
import { autorizadoCron, hojeBRT } from '@/lib/cron-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { msgAniversario, normalizarTelefone, waMeLink } from '@/lib/mensagens';
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
  const mesDia = hoje.slice(5); // MM-DD
  const horaAtual = horaAtualBRT();

  try {
    const supabase = await getSupabaseServiceClient();
    const config = await getMarketingConfig();
    const disparosHoje = await getDisparosHoje(hoje);

    const { data: clientes, error } = await supabase
      .from('salon_customers')
      .select('id, name, phone, birth_date, data_nascimento');

    if (error) throw error;

    const aniversariantes = (clientes ?? []).filter(c => {
      const nasc: string | null = c.birth_date ?? c.data_nascimento ?? null;
      return Boolean(nasc) && String(nasc).slice(5) === mesDia;
    });

    const itens = await Promise.all(aniversariantes.map(async c => {
      const msg = await msgAniversario(c.name ?? '');
      const telefone = normalizarTelefone(c.phone ?? '');
      const chaveUnica = `aniversario:${c.id}`;
      const jaEnviado = disparosHoje.has(chaveUnica);

      return {
        id: c.id,
        tipo: 'aniversario',
        chaveUnica,
        nome: c.name ?? null,
        telefone,
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
        config_aniversarios: config.aniversarios,
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

    const enviados: string[] = [];
    const falhas: { nome: string; error: string }[] = [];

    try {
      for (const item of itens) {
        if (!item.telefone) continue;

        // TRAVA 1: Verificar se a sessão está ativa
        if (!force && !config.aniversarios.ativo) continue;

        // TRAVA 2: Verificar horário programado
        if (!force && horaAtual < config.aniversarios.horario) continue;

        // TRAVA 3: Anti-Duplicação
        if (disparosHoje.has(item.chaveUnica)) continue;

        const r = await enviarTexto(item.telefone, item.mensagem);
        if (r.ok) {
          enviados.push(item.nome ?? '');
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
      enviados_automaticos: enviados.length,
      enviados,
      falhas,
      itens,
    });
  } catch (error: any) {
    console.error('[cron/aniversarios]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
