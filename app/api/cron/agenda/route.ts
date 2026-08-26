/**
 * CRON diÃ¡rio (09h BRT): confirmaÃ§Ãµes de agendamento + feedback pÃ³s-atendimento.
 * - AmanhÃ£: mensagem de confirmaÃ§Ã£o (vÃ©spera)
 * - Hoje: lembrete de mesmo dia
 * - Ontem concluÃ­dos: pedido de feedback do procedimento
 * Envia via Evolution API quando configurada; sempre retorna links wa.me.
 */
import { NextResponse } from 'next/server';
import { autorizadoCron, hojeBRT } from '@/lib/cron-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import {
  msgConfirmacaoVespera, msgLembreteMesmoDia, msgFeedback,
  normalizarTelefone, waMeLink,
} from '@/lib/mensagens';
import { enviarTexto, evolutionConfigurada } from '@/lib/evolution';

function adicionarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

type Agendamento = {
  id: string;
  date: string;
  start_time: string;
  cliente?: { name?: string } | null;
  servico?: { name?: string } | null;
  profissional?: { name?: string } | null;
};

export async function GET(req: Request) {
  if (!(await autorizadoCron(req))) {
    return NextResponse.json({ error: 'NÃ£o autorizado' }, { status: 401 });
  }

  const hoje = hojeBRT();
  const amanha = adicionarDias(hoje, 1);
  const ontem = adicionarDias(hoje, -1);

  try {
    const supabase = await getSupabaseServiceClient();

    // Agendamentos ativos de amanhÃ£ e hoje
    const selectAg = `
      id, date, start_time,
      cliente:salon_customers(id, name, phone),
      servico:salon_services(name),
      profissional:salon_professionals(name)
    `;
    type AgendamentoJoin = Agendamento & {
      cliente?: { name?: string; phone?: string } | null;
    };
    const [vesperaRes, hojeRes] = await Promise.all([
      supabase.from('salon_appointments').select(selectAg).eq('date', amanha).in('status', ['PENDING', 'CONFIRMED']),
      supabase.from('salon_appointments').select(selectAg).eq('date', hoje).in('status', ['PENDING', 'CONFIRMED']),
    ]);
    if (vesperaRes.error) throw vesperaRes.error;
    if (hojeRes.error) throw hojeRes.error;

    // ConcluÃ­dos ontem â†’ feedback
    const { data: concluidos, error: errConcl } = await supabase
      .from('salon_appointments')
      .select(selectAg)
      .eq('date', ontem)
      .in('status', ['COMPLETED', 'CONFIRMED']);
    if (errConcl) throw errConcl;

    type ItemMsg = {
      tipo: string;
      nome: string | null;
      telefone: string;
      mensagem: string;
      wa_link: string;
      enviada_via_api: boolean;
    };

    const montar = (a: AgendamentoJoin, tipo: string, msg: string): ItemMsg => {
      const telefone = normalizarTelefone(a.cliente?.phone ?? '');
      return {
        tipo,
        nome: a.cliente?.name ?? null,
        telefone,
        mensagem: msg,
        wa_link: telefone ? waMeLink(telefone, msg) : '',
        enviada_via_api: false,
      };
    };

    const itens: ItemMsg[] = [];

    for (const a of (vesperaRes.data ?? []) as unknown as AgendamentoJoin[]) {
      itens.push(montar(a, 'confirmacao_vespera', msgConfirmacaoVespera({
        nome: a.cliente?.name ?? '', data: a.date,
        hora: (a.start_time ?? '').slice(0, 5),
        servico: a.servico?.name ?? 'seu atendimento',
        profissional: a.profissional?.name ?? 'nossa equipe',
      })));
    }
    for (const a of (hojeRes.data ?? []) as unknown as AgendamentoJoin[]) {
      itens.push(montar(a, 'lembrete_hoje', msgLembreteMesmoDia({
        nome: a.cliente?.name ?? '',
        hora: (a.start_time ?? '').slice(0, 5),
        servico: a.servico?.name ?? 'seu atendimento',
      })));
    }
    for (const a of (concluidos ?? []) as unknown as AgendamentoJoin[]) {
      itens.push(montar(a, 'feedback', msgFeedback({
        nome: a.cliente?.name ?? '',
        servico: a.servico?.name ?? 'procedimento',
      })));
    }

    const falhas: { nome: string | null; error: string }[] = [];
    let enviadosAutomaticos = 0;

    if (evolutionConfigurada()) {
      for (const item of itens) {
        if (!item.telefone) continue;
        const r = await enviarTexto(item.telefone, item.mensagem);
        item.enviada_via_api = r.ok;
        if (r.ok) enviadosAutomaticos++;
        else falhas.push({ nome: item.nome, error: r.error ?? '' });
      }
    }

    return NextResponse.json({
      ok: true,
      referencia: { hoje, amanha, ontem },
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
