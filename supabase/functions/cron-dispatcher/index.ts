// Edge Function: cron-dispatcher
// Processa e dispara automaticamente todas as automações de WhatsApp (Studio Agnaldo Gomes)
// diretamente no Supabase Edge Runtime (Deno), sem depender dos limites de cron/timeout da Vercel Hobby.
//
// Variáveis de ambiente utilizadas:
// - SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (injetadas automaticamente pelo Supabase)
// - EVOLUTION_API_URL (padrão: https://evolution-agnaldo.onrender.com)
// - EVOLUTION_API_KEY (padrão: AgnaldoGomesWhatsApp2026)
// - EVOLUTION_INSTANCE (padrão: agnaldo)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const EVOLUTION_API_URL = (Deno.env.get('EVOLUTION_API_URL') || 'https://evolution-agnaldo.onrender.com').replace(/\/$/, '');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || 'AgnaldoGomesWhatsApp2026';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') || 'agnaldo';

// Limite seguro de tempo de execução por invocação (110s < 150s limite da Edge Function)
const MAX_EXECUTION_MS = 110_000;

const MENSAGENS_PADRAO = {
  msg_confirmacao: `Olá, {nome}! 💛 Passando para confirmar seu horário de *{servico}* com {profissional} amanhã, {data}, às {hora}, no Agnaldo Gomes Studio.\n\nResponda *SIM* para confirmar ou nos avise caso precise remarcar.`,
  msg_lembrete: `Oi, {nome}! ⏰ Lembrando que seu horário de *{servico}* é HOJE às {hora}. Estamos te esperando no Agnaldo Gomes Studio!`,
  msg_feedback: `Oi, {nome}! 😍 Como está ficando o resultado do seu *{servico}*? Sua opinião vale ouro para nós: responda com uma nota de 0 a 10.`,
  msg_aniversario: `🌸 Feliz Aniversário, {nome}! 🎂 A equipe Agnaldo Gomes Studio deseja que este dia seja tão especial quanto você.`,
  msg_reativacao: `Oi, {nome}! ✨ Sentimos sua falta no Agnaldo Gomes Studio — já faz {tempo} desde seu último cuidado. Que tal reservar um momento só seu?`,
};

function hojeBRT(): string {
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return agora.toISOString().slice(0, 10);
}

function horaAtualBRT(): string {
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return agora.toISOString().slice(11, 16);
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function formatarDataBR(iso: string): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}`;
}

function primeiroNome(nomeCompleto: string): string {
  return (nomeCompleto || '').trim().split(/\s+/)[0] || '';
}

function aplicarTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (m, chave: string) =>
    chave in vars ? vars[chave] : m,
  );
}

function normalizarTelefone(telefone: string): string {
  let d = (telefone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = d.replace(/^0+/, '');
  if (!d) return '';
  if (d.startsWith('55')) {
    if (d.length === 12 || d.length === 13) return d;
    return '';
  }
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return '';
}

async function dispararRequisicaoEvolution(num: string, texto: string) {
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      apikey: EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: num,
      text: texto,
      options: { delay: 1200, presence: 'composing', linkPreview: false },
    }),
  });
  const bodyText = await res.text();
  return { ok: res.ok, status: res.status, body: bodyText };
}

async function enviarTextoEvolution(numero: string, texto: string): Promise<{ ok: boolean; error?: string }> {
  const numNormalizado = normalizarTelefone(numero);
  if (!numNormalizado) return { ok: false, error: 'Número de telefone inválido' };

  try {
    const tentativa = await dispararRequisicaoEvolution(numNormalizado, texto);
    if (!tentativa.ok && (tentativa.body.includes('"exists":false') || tentativa.status === 400)) {
      if (numNormalizado.startsWith('55') && numNormalizado.length === 13) {
        const ddd = numNormalizado.slice(2, 4);
        const semNove = `55${ddd}${numNormalizado.slice(5)}`;
        const t2 = await dispararRequisicaoEvolution(semNove, texto);
        if (t2.ok) return { ok: true };
      }
      if (numNormalizado.startsWith('55') && numNormalizado.length === 12) {
        const ddd = numNormalizado.slice(2, 4);
        const comNove = `55${ddd}9${numNormalizado.slice(4)}`;
        const t2 = await dispararRequisicaoEvolution(comNove, texto);
        if (t2.ok) return { ok: true };
      }
    }
    if (!tentativa.ok) {
      return { ok: false, error: `Evolution ${tentativa.status}: ${tentativa.body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

Deno.serve(async (req: Request) => {
  const inicioExecucao = Date.now();
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === 'true';

  const hoje = hojeBRT();
  const amanha = somarDias(hoje, 1);
  const ontem = somarDias(hoje, -1);
  const anteontem = somarDias(hoje, -2);
  const horaAtual = horaAtualBRT();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Carregar salon_system_settings
    const { data: settingsRows, error: errSettings } = await supabase
      .from('salon_system_settings')
      .select('key, value');

    if (errSettings) throw errSettings;

    const settingsMap: Record<string, string> = {};
    for (const r of settingsRows ?? []) {
      settingsMap[r.key] = r.value;
    }

    // Parse config de automação
    const rawCfg = settingsMap['marketing_automacao_config']
      ? JSON.parse(settingsMap['marketing_automacao_config'])
      : {};

    const config = {
      aniversarios: {
        ativo: Boolean(rawCfg.aniversarios?.ativo),
        horario: rawCfg.aniversarios?.horario || '09:00',
      },
      agenda_confirmacao: {
        ativo: Boolean(rawCfg.agenda_confirmacao?.ativo),
        horario: rawCfg.agenda_confirmacao?.horario || '09:30',
      },
      agenda_lembrete: {
        ativo: Boolean(rawCfg.agenda_lembrete?.ativo),
        horario: rawCfg.agenda_lembrete?.horario || '08:30',
      },
      feedback: {
        ativo: Boolean(rawCfg.feedback?.ativo),
        horario: rawCfg.feedback?.horario || '16:00',
        tipo_filtro: rawCfg.feedback?.tipo_filtro === 'selecionados' ? 'selecionados' : 'todos',
        servicos_permitidos: Array.isArray(rawCfg.feedback?.servicos_permitidos) ? rawCfg.feedback.servicos_permitidos : [],
        categorias_permitidas: Array.isArray(rawCfg.feedback?.categorias_permitidas) ? rawCfg.feedback.categorias_permitidas : [],
      },
      reativacao: {
        ativo: Boolean(rawCfg.reativacao?.ativo),
        horario: rawCfg.reativacao?.horario || '11:00',
      },
      intervalo_segundos: Math.max(60, Number(rawCfg.intervalo_segundos) || 60),
    };

    const chaveDisparosHoje = `marketing_disparos_${hoje}`;
    const disparosHoje = new Set<string>(
      settingsMap[chaveDisparosHoje] ? JSON.parse(settingsMap[chaveDisparosHoje]) : []
    );

    let ultimoDisparoTs = settingsMap['marketing_ultimo_disparo_ts']
      ? Number(settingsMap['marketing_ultimo_disparo_ts']) || 0
      : 0;

    const getTemplate = (chave: keyof typeof MENSAGENS_PADRAO): string =>
      settingsMap[chave]?.trim() || MENSAGENS_PADRAO[chave];

    // Fila unificada de candidatos a disparo neste ciclo
    type CandidatoDisparo = {
      sessao: string;
      chaveUnica: string;
      nome: string;
      telefone: string;
      mensagem: string;
    };
    const filaDisparos: CandidatoDisparo[] = [];

    // 2. LEMBRETES DO MESMO DIA (agenda_lembrete)
    if (force || (config.agenda_lembrete.ativo && horaAtual >= config.agenda_lembrete.horario)) {
      const { data: hojeAgs } = await supabase
        .from('salon_appointments')
        .select('id, date, start_time, cliente:salon_customers(id, name, phone), servico:salon_services(name)')
        .eq('date', hoje)
        .in('status', ['PENDING', 'CONFIRMED'])
        .order('start_time', { ascending: true });

      const vistos = new Set<string>();
      for (const a of (hojeAgs ?? []) as any[]) {
        const cli = Array.isArray(a.cliente) ? a.cliente[0] : a.cliente;
        const srv = Array.isArray(a.servico) ? a.servico[0] : a.servico;
        const chaveCli = cli?.id || cli?.phone || a.id;
        if (vistos.has(chaveCli)) continue;
        vistos.add(chaveCli);

        const chaveUnica = `lembrete:${cli?.id || a.id}`;
        if (disparosHoje.has(chaveUnica)) continue;

        const telefone = normalizarTelefone(cli?.phone ?? '');
        if (!telefone) continue;

        const mensagem = aplicarTemplate(getTemplate('msg_lembrete'), {
          nome: primeiroNome(cli?.name ?? ''),
          hora: (a.start_time ?? '').slice(0, 5),
          servico: srv?.name ?? 'seu atendimento',
        });

        filaDisparos.push({
          sessao: 'agenda_lembrete',
          chaveUnica,
          nome: cli?.name ?? 'Cliente',
          telefone,
          mensagem,
        });
      }
    }

    // 3. CONFIRMAÇÃO DE VÉSPERA (agenda_confirmacao)
    if (force || (config.agenda_confirmacao.ativo && horaAtual >= config.agenda_confirmacao.horario)) {
      const { data: amanhaAgs } = await supabase
        .from('salon_appointments')
        .select('id, date, start_time, cliente:salon_customers(id, name, phone), servico:salon_services(name), profissional:salon_professionals(name)')
        .eq('date', amanha)
        .in('status', ['PENDING', 'CONFIRMED'])
        .order('start_time', { ascending: true });

      const vistos = new Set<string>();
      for (const a of (amanhaAgs ?? []) as any[]) {
        const cli = Array.isArray(a.cliente) ? a.cliente[0] : a.cliente;
        const srv = Array.isArray(a.servico) ? a.servico[0] : a.servico;
        const prof = Array.isArray(a.profissional) ? a.profissional[0] : a.profissional;
        const chaveCli = cli?.id || cli?.phone || a.id;
        if (vistos.has(chaveCli)) continue;
        vistos.add(chaveCli);

        const chaveUnica = `confirmacao:${cli?.id || a.id}`;
        if (disparosHoje.has(chaveUnica)) continue;

        const telefone = normalizarTelefone(cli?.phone ?? '');
        if (!telefone) continue;

        const mensagem = aplicarTemplate(getTemplate('msg_confirmacao'), {
          nome: primeiroNome(cli?.name ?? ''),
          data: formatarDataBR(a.date),
          hora: (a.start_time ?? '').slice(0, 5),
          servico: srv?.name ?? 'seu atendimento',
          profissional: primeiroNome(prof?.name ?? '') || 'nossa equipe',
        });

        filaDisparos.push({
          sessao: 'agenda_confirmacao',
          chaveUnica,
          nome: cli?.name ?? 'Cliente',
          telefone,
          mensagem,
        });
      }
    }

    // 4. ANIVERSÁRIOS DO DIA
    if (force || (config.aniversarios.ativo && horaAtual >= config.aniversarios.horario)) {
      const mesDia = hoje.slice(5);
      const { data: clientes } = await supabase
        .from('salon_customers')
        .select('id, name, phone, birth_date, data_nascimento');

      for (const c of (clientes ?? []) as any[]) {
        const nasc: string | null = c.birth_date ?? c.data_nascimento ?? null;
        if (!nasc || String(nasc).slice(5) !== mesDia) continue;

        const chaveUnica = `aniversario:${c.id}`;
        if (disparosHoje.has(chaveUnica)) continue;

        const telefone = normalizarTelefone(c.phone ?? '');
        if (!telefone) continue;

        const mensagem = aplicarTemplate(getTemplate('msg_aniversario'), {
          nome: primeiroNome(c.name ?? ''),
        });

        filaDisparos.push({
          sessao: 'aniversarios',
          chaveUnica,
          nome: c.name ?? 'Cliente',
          telefone,
          mensagem,
        });
      }
    }

    // 5. FEEDBACK PÓS-ATENDIMENTO
    if (force || (config.feedback.ativo && horaAtual >= config.feedback.horario)) {
      const { data: concluidos } = await supabase
        .from('salon_appointments')
        .select('id, date, start_time, cliente:salon_customers(id, name, phone), servico:salon_services(id, name, category)')
        .in('date', [ontem, anteontem])
        .in('status', ['COMPLETED', 'CONFIRMED'])
        .order('date', { ascending: false });

      const vistos = new Set<string>();
      for (const a of (concluidos ?? []) as any[]) {
        const cli = Array.isArray(a.cliente) ? a.cliente[0] : a.cliente;
        const srv = Array.isArray(a.servico) ? a.servico[0] : a.servico;

        if (config.feedback.tipo_filtro === 'selecionados') {
          const sp = config.feedback.servicos_permitidos;
          const cp = config.feedback.categorias_permitidas;
          if (sp.length === 0 && cp.length === 0) continue;
          const matchSrv = srv?.id && sp.includes(srv.id);
          const matchCat = srv?.category && cp.includes(srv.category);
          if (!matchSrv && !matchCat) continue;
        }

        const chaveCli = cli?.id || cli?.phone || a.id;
        if (vistos.has(chaveCli)) continue;
        vistos.add(chaveCli);

        const chaveUnica = `feedback:${cli?.id || a.id}`;
        if (disparosHoje.has(chaveUnica)) continue;

        const telefone = normalizarTelefone(cli?.phone ?? '');
        if (!telefone) continue;

        const mensagem = aplicarTemplate(getTemplate('msg_feedback'), {
          nome: primeiroNome(cli?.name ?? ''),
          servico: srv?.name ?? 'seu atendimento',
        });

        filaDisparos.push({
          sessao: 'feedback',
          chaveUnica,
          nome: cli?.name ?? 'Cliente',
          telefone,
          mensagem,
        });
      }
    }

    // 6. REGRAS PERSONALIZADAS DE MARKETING
    const { data: regras } = await supabase
      .from('salon_marketing_rules')
      .select('*, service:salon_services(id, name)')
      .order('created_at', { ascending: true });

    for (const regra of (regras ?? []) as any[]) {
      if ((regra.send_method ?? 'AUTO') !== 'AUTO') continue;
      const cfgRaw = settingsMap[`mkt_rule_cfg_${regra.id}`];
      const regraCfg = cfgRaw ? JSON.parse(cfgRaw) : { ativo: false, horario: '10:00' };

      if (!force && (!regraCfg.ativo || horaAtual < (regraCfg.horario ?? '10:00'))) continue;

      const offsetDias = regra.days_offset ?? 1;
      const timing: 'BEFORE' | 'AFTER' = regra.trigger_timing ?? 'AFTER';
      const dataReferencia = timing === 'AFTER' ? somarDias(hoje, -offsetDias) : somarDias(hoje, offsetDias);

      let agQuery = supabase
        .from('salon_appointments')
        .select('id, date, start_time, cliente:salon_customers(id, name, phone), servico:salon_services(id, name)')
        .eq('date', dataReferencia);

      if (timing === 'AFTER') {
        agQuery = agQuery.in('status', ['COMPLETED', 'CONFIRMED']);
      } else {
        agQuery = agQuery.in('status', ['CONFIRMED', 'PENDING']);
      }
      if (regra.service_id) {
        agQuery = agQuery.eq('service_id', regra.service_id);
      }

      const { data: agsRegra } = await agQuery;
      const vistos = new Set<string>();
      for (const a of (agsRegra ?? []) as any[]) {
        const cli = Array.isArray(a.cliente) ? a.cliente[0] : a.cliente;
        const srv = Array.isArray(a.servico) ? a.servico[0] : a.servico;
        const chaveCli = cli?.id || cli?.phone || a.id;
        if (vistos.has(chaveCli)) continue;
        vistos.add(chaveCli);

        const chaveUnica = `mkt_rule:${regra.id}:${cli?.id || a.id}`;
        if (disparosHoje.has(chaveUnica)) continue;

        const telefone = normalizarTelefone(cli?.phone ?? '');
        if (!telefone) continue;

        const mensagem = aplicarTemplate(regra.message_template ?? '', {
          nome: cli?.name ?? '',
          servico: srv?.name ?? regra.service?.name ?? '',
          profissional: '',
          data: dataReferencia,
          hora: (a.start_time ?? '').slice(0, 5),
        });

        filaDisparos.push({
          sessao: `regra:${regra.name}`,
          chaveUnica,
          nome: cli?.name ?? 'Cliente',
          telefone,
          mensagem,
        });
      }
    }

    // 7. PROCESSAR FILA COM INTERVALO MÍNIMO DE 1 MINUTO ENTRE ENVIOS
    const intervaloMs = Math.max(60, config.intervalo_segundos) * 1000;
    const enviados: { sessao: string; nome: string; chaveUnica: string }[] = [];
    const falhas: { sessao: string; nome: string; error: string }[] = [];
    let adiadoParaProximoCiclo = 0;

    for (let i = 0; i < filaDisparos.length; i++) {
      const item = filaDisparos[i];

      // Calcular quanto tempo falta para respeitar o intervalo mínimo desde o último disparo
      const agora = Date.now();
      const decorridoDesdeUltimo = ultimoDisparoTs > 0 ? agora - ultimoDisparoTs : intervaloMs;
      const esperaNecessariaMs = decorridoDesdeUltimo < intervaloMs ? intervaloMs - decorridoDesdeUltimo : 0;

      // Verifica se há tempo suficiente nesta execução antes do timeout da Edge Function
      if (Date.now() - inicioExecucao + esperaNecessariaMs + 5000 > MAX_EXECUTION_MS) {
        adiadoParaProximoCiclo = filaDisparos.length - i;
        break;
      }

      if (esperaNecessariaMs > 0) {
        await new Promise(resolve => setTimeout(resolve, esperaNecessariaMs));
      }

      const r = await enviarTextoEvolution(item.telefone, item.mensagem);
      if (r.ok) {
        ultimoDisparoTs = Date.now();
        disparosHoje.add(item.chaveUnica);
        enviados.push({ sessao: item.sessao, nome: item.nome, chaveUnica: item.chaveUnica });

        const isoNow = new Date(ultimoDisparoTs).toISOString();
        await Promise.all([
          supabase.from('salon_system_settings').upsert(
            {
              key: chaveDisparosHoje,
              value: JSON.stringify(Array.from(disparosHoje)),
              updated_at: isoNow,
            },
            { onConflict: 'key' }
          ),
          supabase.from('salon_system_settings').upsert(
            {
              key: 'marketing_ultimo_disparo_ts',
              value: String(ultimoDisparoTs),
              updated_at: isoNow,
            },
            { onConflict: 'key' }
          ),
        ]);
      } else {
        falhas.push({ sessao: item.sessao, nome: item.nome, error: r.error ?? 'Erro desconhecido' });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data_hoje: hoje,
        horario_atual_brt: horaAtual,
        intervalo_segundos: config.intervalo_segundos,
        total_na_fila: filaDisparos.length,
        enviados_neste_ciclo: enviados.length,
        restantes_proximo_ciclo: adiadoParaProximoCiclo,
        enviados,
        falhas,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[cron-dispatcher]', error);
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
