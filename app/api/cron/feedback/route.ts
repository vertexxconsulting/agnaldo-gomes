/**
 * CRON diário (09h BRT): feedback pós-atendimento.
 * Busca agendamentos CONCLUÍDOS (COMPLETED ou CONFIRMED) de ontem e anteontem
 * e envia mensagem pedindo avaliação do procedimento.
 * Foca em serviços de mechas, coloração e tratamentos, mas contempla todos.
 */
import { NextResponse } from 'next/server';
import { autorizadoCron, hojeBRT, somarDias } from '@/lib/cron-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { msgFeedback, normalizarTelefone, waMeLink } from '@/lib/mensagens';
import { enviarTexto, evolutionConfigurada } from '@/lib/evolution';

export async function GET(req: Request) {
  if (!(await autorizadoCron(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const hoje = hojeBRT();
  const ontem = somarDias(hoje, -1);
  const anteontem = somarDias(hoje, -2);

  try {
    const supabase = await getSupabaseServiceClient();

    const selectAg = `
      id, date, start_time,
      cliente:salon_customers(id, name, phone),
      servico:salon_services(id, name),
      profissional:salon_professionals(name)
    `;

    const { data: concluidos, error } = await supabase
      .from('salon_appointments')
      .select(selectAg)
      .in('date', [ontem, anteontem])
      .in('status', ['COMPLETED', 'CONFIRMED']);

    if (error) throw error;

    type AgendamentoJoin = {
      id: string;
      date: string;
      start_time: string;
      cliente?: { name?: string; phone?: string } | null;
      servico?: { id?: string; name?: string } | null;
      profissional?: { name?: string } | null;
    };

    const itens = (concluidos ?? [] as AgendamentoJoin[]).map((a: AgendamentoJoin) => {
      const telefone = normalizarTelefone(a.cliente?.phone ?? '');
      const nomeProcedimento = a.servico?.name ?? 'procedimento';
      const msg = msgFeedback({ nome: a.cliente?.name ?? '', servico: nomeProcedimento });

      return {
        tipo: 'feedback',
        nome: a.cliente?.name ?? null,
        telefone,
        servico: nomeProcedimento,
        data: a.date,
        mensagem: msg,
        wa_link: telefone ? waMeLink(telefone, msg) : '',
        enviada_via_api: false as boolean,
      };
    });

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
      referencia: { hoje, ontem, anteontem },
      total: itens.length,
      evolution_conectada: evolutionConfigurada(),
      enviados_automaticos: enviadosAutomaticos,
      falhas,
      itens,
    });
  } catch (err: any) {
    console.error('[cron/feedback]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
