import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const data = searchParams.get('data');
    const profissional_id = searchParams.get('profissional_id');

    let query = auth.supabase!
      .from('salon_appointments')
      .select('*')
      .order('date', { ascending: false })
      .order('start_time');

    if (data) query = query.eq('date', data);
    if (profissional_id) query = query.eq('professional_id', profissional_id);

    const { data: agendamentos, error } = await query;
    if (error) {
      console.error('[api/agendamentos/admin] Erro ao buscar agendamentos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(agendamentos || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { cliente_id, profissional_id, servico_id, sub_servicos, data, hora_inicio, hora_fim, status, canal, is_fixed, recurrence_type, recurrence_custom_day, allow_overlap } = body;

    if (!cliente_id || !profissional_id || !servico_id || !data || !hora_inicio) {
      return NextResponse.json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' }, { status: 400 });
    }

    // A validação de conflito foi movida para abranger todas as datas geradas (recorrência)

    const canalDb = (canal === 'online' || canal === 'ONLINE') ? 'ONLINE' : 'RECEPTION';
    
    let statusDb = 'CONFIRMED';
    const statusClean = String(status || '').toLowerCase();
    if (statusClean === 'pendente' || statusClean === 'pending') statusDb = 'PENDING';
    else if (statusClean === 'em_atendimento' || statusClean === 'in_progress') statusDb = 'IN_PROGRESS';
    else if (statusClean === 'concluido' || statusClean === 'completed') statusDb = 'COMPLETED';
    else if (statusClean === 'cancelado' || statusClean === 'cancelled') statusDb = 'CANCELLED';
    else if (statusClean === 'no_show') statusDb = 'NO_SHOW';

    const payloads = [];
    const firstPayload = {
      customer_id: cliente_id,
      professional_id: profissional_id,
      service_id: servico_id,
      sub_services: Array.isArray(sub_servicos) && sub_servicos.length > 0 ? sub_servicos.filter((id: string) => id.trim() !== '') : null,
      date: data,
      start_time: hora_inicio,
      end_time: hora_fim || hora_inicio,
      status: statusDb,
      channel: canalDb,
      is_fixed: is_fixed || false,
      recurrence_type: recurrence_type || null,
      recurrence_custom_day: recurrence_custom_day ? parseInt(recurrence_custom_day) : null,
    };
    payloads.push(firstPayload);

    // Geração das recorrências
    if (is_fixed && recurrence_type) {
      let maxOccurrences = 1;
      if (recurrence_type === 'WEEKLY') maxOccurrences = 24; // ~6 meses
      else if (recurrence_type === 'BIWEEKLY') maxOccurrences = 12; // ~6 meses
      else if (recurrence_type === 'MONTHLY' || recurrence_type === 'CUSTOM') maxOccurrences = 6; // 6 meses

      // O objeto Date lida com fuso horário da máquina (vamos usar T12:00 para evitar problemas)
      let baseDate = new Date(data + 'T12:00:00');

      for (let i = 1; i < maxOccurrences; i++) {
        let nextDate = new Date(baseDate);
        if (recurrence_type === 'WEEKLY') {
          nextDate.setDate(nextDate.getDate() + 7 * i);
        } else if (recurrence_type === 'BIWEEKLY') {
          nextDate.setDate(nextDate.getDate() + 14 * i);
        } else if (recurrence_type === 'MONTHLY') {
          nextDate.setMonth(nextDate.getMonth() + i);
        } else if (recurrence_type === 'CUSTOM') {
          let customDay = parseInt(recurrence_custom_day);
          nextDate.setMonth(nextDate.getMonth() + i);
          const d = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(customDay, d));
        }

        // Evita domingo(0) e segunda(1) movendo para terça
        while (nextDate.getDay() === 0 || nextDate.getDay() === 1) {
          nextDate.setDate(nextDate.getDate() + 1);
        }

        payloads.push({
          ...firstPayload,
          date: nextDate.toISOString().split('T')[0]
        });
      }
    }

    // 1. VALIDAÇÃO DE CONFLITO PARA TODAS AS DATAS GERADAS
    const datesToCheck = payloads.map(p => p.date);
    const { data: allConflicts } = await auth.supabase!
      .from('salon_appointments')
      .select('date, start_time, end_time')
      .eq('professional_id', profissional_id)
      .in('date', datesToCheck)
      .neq('status', 'CANCELLED');


    // Filtra apenas os payloads que NÃO conflitam com horários existentes (a menos que seja encaixe)
    const validPayloads = allow_overlap ? payloads : payloads.filter(p => {
      const conflictsForDate = allConflicts?.filter((c: any) => c.date === p.date) || [];
      const hasOverlap = conflictsForDate.some((app: any) => {
        const startA = p.start_time;
        const endA = p.end_time;
        const startB = app.start_time;
        const endB = app.end_time;
        return startA < endB && endA > startB;
      });
      return !hasOverlap;
    });

    if (validPayloads.length === 0) {
      return NextResponse.json({ error: 'O horário selecionado (e suas recorrências projetadas) já estão ocupados.' }, { status: 409 });
    }

    const { data: agendamentos, error } = await auth.supabase!
      .from('salon_appointments')
      .insert(validPayloads)
      .select('*');

    if (error) {
      console.error('[api/agendamentos/admin] Erro ao salvar agendamento:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, agendamento: agendamentos[0], projecoes: validPayloads.length });
  } catch (err) {
    console.error('[api/agendamentos/admin] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}