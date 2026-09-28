import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { sincronizarStatusAgendamentoComBolten, StatusSyncPayload } from '@/lib/bolten';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { agendamentoId, status } = body as { agendamentoId: string; status: string };

    if (!agendamentoId || !status) {
      return NextResponse.json({ error: 'agendamentoId e status são obrigatórios' }, { status: 400 });
    }

    const validStatuses = ['confirmado', 'em_atendimento', 'concluido', 'cancelado', 'no_show'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const supabase = auth.supabase!;

    // Buscar dados do agendamento para sincronizar
    const { data: agendamento, error } = await supabase
      .from('salon_appointments')
      .select(`
        id,
        status,
        date,
        start_time,
        end_time,
        customer_id,
        professional_id,
        service_id,
        salon_customers!inner(name, phone, email),
        salon_professionals!inner(name),
        salon_services!inner(name, price)
      `)
      .eq('id', agendamentoId)
      .single();

    if (error || !agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const payload: StatusSyncPayload = {
      opportunityId: agendamento.id,
      status: status as StatusSyncPayload['status'],
      nome: agendamento.salon_customers?.name || 'Cliente',
      telefone: agendamento.salon_customers?.phone || '',
      email: agendamento.salon_customers?.email || null,
      servico: agendamento.salon_services?.name || 'Serviço',
      profissional: agendamento.salon_professionals?.name || 'Profissional',
      data: agendamento.date,
      hora: agendamento.start_time,
      valor: Number(agendamento.salon_services?.price || 0),
    };

    const result = await sincronizarStatusAgendamentoComBolten(payload);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[bolten-sync-status] Erro:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}