/**
 * CRON / Preview: regras de marketing personalizadas.
 *
 * Calcula quais clientes devem receber a mensagem de cada regra,
 * com base no offset de dias (BEFORE = antes do agendamento, AFTER = após serviço concluído).
 *
 * Modos de operação:
 *  - GET ?preview=true  → apenas lista, NUNCA dispara (usado pelo painel)
 *  - GET ?execute=true  → dispara via Evolution API respeitando travas
 *
 * Parâmetros opcionais:
 *  - ?ruleId=<uuid>     → processa apenas uma regra específica
 */
import { NextResponse } from 'next/server';
import { autorizadoCron, hojeBRT, somarDias } from '@/lib/cron-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { normalizarTelefone, waMeLink, aplicarTemplate } from '@/lib/mensagens';
import { enviarTexto, evolutionConfigurada } from '@/lib/evolution';
import {
  getMarketingConfig,
  getDisparosHoje,
  registrarDisparoHoje,
  esperarIntervaloSeguro,
  tentarObterLockDisparo,
  liberarLockDisparo,
} from '@/lib/marketing-control';

export async function GET(req: Request) {
  if (!(await autorizadoCron(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(req.url);
  const isVercelCron = Boolean(req.headers.get('x-vercel-cron'));
  const isExecute = url.searchParams.get('execute') === 'true' || isVercelCron;
  const force = url.searchParams.get('force') === 'true';
  const ruleIdFiltro = url.searchParams.get('ruleId') ?? null;

  const hoje = hojeBRT();

  try {
    const supabase = await getSupabaseServiceClient();
    const config = await getMarketingConfig();
    const disparosHoje = await getDisparosHoje(hoje);

    // 1. Buscar todas as regras (ou apenas uma específica)
    let regraQuery = supabase
      .from('salon_marketing_rules')
      .select('*, service:salon_services(id, name)')
      .order('created_at', { ascending: true });

    if (ruleIdFiltro) {
      regraQuery = regraQuery.eq('id', ruleIdFiltro) as any;
    }

    const { data: regras, error: erroRegras } = await regraQuery;
    if (erroRegras) throw erroRegras;
    if (!regras || regras.length === 0) {
      return NextResponse.json({ ok: true, total: 0, itens_por_regra: [] });
    }

    // 2. Para cada regra, calcular destinatários
    const itensPorRegra: Array<{
      regra_id: string;
      regra_nome: string;
      trigger_timing: string;
      days_offset: number;
      send_method: string;
      ativo: boolean;
      horario: string;
      itens: Array<{
        tipo: string;
        chaveUnica: string;
        nome: string | null;
        telefone: string;
        mensagem: string;
        wa_link: string;
        ja_enviado_hoje: boolean;
        enviada_via_api: boolean;
        data_referencia: string;
        servico_nome: string | null;
      }>;
    }> = [];

    for (const regra of regras) {
      const offsetDias = regra.days_offset ?? 1;
      const timing: 'BEFORE' | 'AFTER' = regra.trigger_timing ?? 'AFTER';

      // A data de referência do agendamento que gera o envio
      // AFTER: agendamento foi em offsetDias atrás → data = hoje - offset
      // BEFORE: agendamento será em offsetDias à frente → data = hoje + offset
      const dataReferencia =
        timing === 'AFTER'
          ? somarDias(hoje, -offsetDias)
          : somarDias(hoje, offsetDias);

      // 3. Buscar agendamentos na data de referência
      let agQuery = supabase
        .from('salon_appointments')
        .select(
          `id, date, start_time,
           cliente:salon_customers(id, name, phone),
           servico:salon_services(id, name)`
        )
        .eq('date', dataReferencia);

      if (timing === 'AFTER') {
        agQuery = agQuery.in('status', ['COMPLETED', 'CONFIRMED']) as any;
      } else {
        // BEFORE: agendamentos futuros ativos
        agQuery = agQuery.in('status', ['CONFIRMED', 'PENDING']) as any;
      }

      // Filtrar por serviço se a regra tiver service_id
      if (regra.service_id) {
        agQuery = agQuery.eq('service_id', regra.service_id) as any;
      }

      const { data: agendamentos } = await agQuery;

      type AgJoin = {
        id: string;
        date: string;
        start_time?: string;
        cliente?: { id?: string; name?: string; phone?: string } | { id?: string; name?: string; phone?: string }[] | null;
        servico?: { id?: string; name?: string } | { id?: string; name?: string }[] | null;
      };

      const getCliente = (a: AgJoin) => {
        if (!a.cliente) return null;
        return Array.isArray(a.cliente) ? a.cliente[0] : a.cliente;
      };
      const getServico = (a: AgJoin) => {
        if (!a.servico) return null;
        return Array.isArray(a.servico) ? a.servico[0] : a.servico;
      };

      // Deduplicação por cliente
      const unicosPorCliente = new Map<string, AgJoin>();
      for (const a of (agendamentos ?? []) as unknown as AgJoin[]) {
        const c = getCliente(a);
        const chave = c?.id || c?.phone || a.id;
        if (!unicosPorCliente.has(chave)) unicosPorCliente.set(chave, a);
      }

      const itens = (await Promise.all(
        Array.from(unicosPorCliente.values()).map(async (a) => {
          const cliente = getCliente(a);
          const servico = getServico(a);
          const telefone = normalizarTelefone(cliente?.phone ?? '');
          const chaveUnica = `mkt_rule:${regra.id}:${cliente?.id || a.id}`;
          const jaEnviado = disparosHoje.has(chaveUnica);

          // Substitui variáveis do template
          const vars: Record<string, string> = {
            nome: cliente?.name ?? '',
            servico: servico?.name ?? (regra.service as any)?.name ?? '',
            profissional: '',
            data: dataReferencia,
            hora: a.start_time?.slice(0, 5) ?? '',
          };
          const mensagem = aplicarTemplate(regra.message_template ?? '', vars);

          return {
            tipo: `regra_personalizada`,
            chaveUnica,
            nome: cliente?.name ?? null,
            telefone,
            mensagem,
            wa_link: telefone ? waMeLink(telefone, mensagem) : '',
            ja_enviado_hoje: jaEnviado,
            enviada_via_api: jaEnviado,
            data_referencia: dataReferencia,
            servico_nome: servico?.name ?? (regra.service as any)?.name ?? null,
          };
        })
      )).filter(i => i.telefone); // apenas quem tem telefone

      // Recuperar config de ativo/horario da regra (stored em salon_system_settings)
      const settingKey = `mkt_rule_cfg_${regra.id}`;
      const { data: settingRow } = await supabase
        .from('salon_system_settings')
        .select('value')
        .eq('key', settingKey)
        .maybeSingle();

      const regraCfg = settingRow?.value
        ? JSON.parse(settingRow.value)
        : { ativo: false, horario: '10:00' };

      itensPorRegra.push({
        regra_id: regra.id,
        regra_nome: regra.name,
        trigger_timing: timing,
        days_offset: offsetDias,
        send_method: regra.send_method ?? 'AUTO',
        ativo: Boolean(regraCfg.ativo),
        horario: regraCfg.horario ?? '10:00',
        itens,
      });
    }

    const totalGeral = itensPorRegra.reduce((s, r) => s + r.itens.length, 0);

    // MODO PREVIEW: retorna sem disparar
    if (!isExecute) {
      return NextResponse.json({
        ok: true,
        modo: 'preview',
        hoje,
        total: totalGeral,
        evolution_conectada: evolutionConfigurada(),
        itens_por_regra: itensPorRegra,
      });
    }

    // MODO EXECUÇÃO
    if (!evolutionConfigurada()) {
      return NextResponse.json({ ok: false, error: 'Evolution API não configurada' }, { status: 400 });
    }

    if (!tentarObterLockDisparo()) {
      return NextResponse.json({
        ok: false,
        error: 'Já existe um ciclo de disparo em andamento. Aguarde.',
      }, { status: 429 });
    }

    let enviadosAutomaticos = 0;
    const falhas: { regra: string; nome: string | null; error: string }[] = [];

    try {
      for (const grupo of itensPorRegra) {
        if (grupo.send_method !== 'AUTO') continue;
        if (!force && !grupo.ativo) continue;

        for (const item of grupo.itens) {
          if (!item.telefone) continue;
          if (disparosHoje.has(item.chaveUnica)) continue;

          const r = await enviarTexto(item.telefone, item.mensagem);
          if (r.ok) {
            enviadosAutomaticos++;
            item.enviada_via_api = true;
            item.ja_enviado_hoje = true;
            await registrarDisparoHoje(item.chaveUnica, hoje);
            await esperarIntervaloSeguro(config.intervalo_segundos);
          } else {
            falhas.push({ regra: grupo.regra_nome, nome: item.nome, error: r.error ?? '' });
          }
        }
      }
    } finally {
      liberarLockDisparo();
    }

    return NextResponse.json({
      ok: true,
      modo: 'execute',
      hoje,
      total: totalGeral,
      evolution_conectada: evolutionConfigurada(),
      enviados_automaticos: enviadosAutomaticos,
      falhas,
      itens_por_regra: itensPorRegra,
    });
  } catch (err: any) {
    console.error('[cron/marketing-rules]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
