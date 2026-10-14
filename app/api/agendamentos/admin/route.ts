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

function appointmentAllowsOverlap(app: any): boolean {
  if (app?.allow_overlap === true) return true;
  if (Array.isArray(app?.sub_services) && app.sub_services.some((s: any) => s?._meta && s?.allow_overlap)) return true;
  return false;
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

    let subServicesFiltered =
      Array.isArray(sub_servicos) && sub_servicos.length > 0
        ? sub_servicos.filter((sub: any) =>
            typeof sub === 'string' ? sub.trim() !== '' : sub.id?.trim() !== ''
          )
        : [];

    if (allow_overlap) {
      subServicesFiltered = [...subServicesFiltered.filter((s: any) => !s?._meta), { _meta: true, allow_overlap: true }];
    }

    interface AppointmentPayload {
      customer_id: string;
      professional_id: string;
      service_id: string;
      date: string;
      start_time: string;
      end_time: string;
      status: string;
      channel: string;
      is_fixed: boolean;
      recurrence_type: string | null;
      recurrence_custom_day: number | null;
      sub_services?: any[];
      allow_overlap?: boolean;
    }

    let calculatedHoraFim = hora_fim;
    if (!calculatedHoraFim || calculatedHoraFim <= hora_inicio) {
      try {
        const { data: srvData } = await auth.supabase!
          .from('salon_services')
          .select('duration_minutes')
          .eq('id', servico_id)
          .maybeSingle();
        let totalMins = Number(srvData?.duration_minutes) || 60;
        if (subServicesFiltered.length > 0) {
          const subIds = subServicesFiltered.filter((s: any) => !s?._meta).map((s: any) => typeof s === 'string' ? s : s.id);
          const { data: subsData } = await auth.supabase!
            .from('salon_services')
            .select('duration_minutes')
            .in('id', subIds);
          if (subsData && subsData.length > 0) {
            totalMins += subsData.reduce((acc: number, cur: any) => acc + (Number(cur.duration_minutes) || 0), 0);
          }
        }
        const [h, m] = hora_inicio.split(':').map(Number);
        const endD = new Date(2000, 0, 1, h, m + totalMins);
        calculatedHoraFim = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
      } catch {
        calculatedHoraFim = hora_fim || hora_inicio;
      }
    }

    const payloads: AppointmentPayload[] = [];
    const firstPayload: AppointmentPayload = {
      customer_id: cliente_id,
      professional_id: profissional_id,
      service_id: servico_id,
      date: data,
      start_time: hora_inicio,
      end_time: calculatedHoraFim || hora_inicio,
      status: statusDb,
      channel: canalDb,
      is_fixed: is_fixed || false,
      recurrence_type: recurrence_type || null,
      recurrence_custom_day: recurrence_custom_day ? parseInt(recurrence_custom_day) : null,
      allow_overlap: Boolean(allow_overlap),
    };

    // sub_services: só inclui se houver valores
    if (subServicesFiltered.length > 0) {
      firstPayload.sub_services = subServicesFiltered;
    }

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
      .select('*')
      .eq('professional_id', profissional_id)
      .in('date', datesToCheck)
      .neq('status', 'CANCELLED');

    // Filtra apenas os payloads que NÃO conflitam com horários existentes (a menos que seja encaixe ou que o agendamento conflitante permita sobreposição/pausa)
    const validPayloads = allow_overlap ? payloads : payloads.filter(p => {
      const conflictsForDate = allConflicts?.filter((c: any) => c.date === p.date) || [];
      const hasOverlap = conflictsForDate.some((app: any) => {
        // Se o agendamento já existente no horário permite sobreposição/encaixe, não bloqueia este atendimento
        if (appointmentAllowsOverlap(app)) return false;

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

    let agendamentosResult: any = null;
    const { data: agendamentos, error } = await auth.supabase!
      .from('salon_appointments')
      .insert(validPayloads)
      .select('*');

    if (error) {
      if (error.message?.includes('sub_services') || error.message?.includes('allow_overlap')) {
        const cleanPayloads = validPayloads.map(p => {
          const cp: any = { ...p };
          if (error.message?.includes('sub_services')) delete cp.sub_services;
          if (error.message?.includes('allow_overlap')) delete cp.allow_overlap;
          return cp;
        });
        const retry = await auth.supabase!
          .from('salon_appointments')
          .insert(cleanPayloads)
          .select('*');
        if (retry.error) {
          if (retry.error.message?.includes('sub_services') || retry.error.message?.includes('allow_overlap')) {
            const cleanAll = cleanPayloads.map(p => {
              const cp: any = { ...p };
              delete cp.sub_services;
              delete cp.allow_overlap;
              return cp;
            });
            const retry2 = await auth.supabase!
              .from('salon_appointments')
              .insert(cleanAll)
              .select('*');
            if (retry2.error) {
              console.error('[api/agendamentos/admin] Erro ao salvar agendamento (retry2):', retry2.error);
              return NextResponse.json({ error: retry2.error.message }, { status: 500 });
            }
            agendamentosResult = retry2.data;
          } else {
            console.error('[api/agendamentos/admin] Erro ao salvar agendamento (retry):', retry.error);
            return NextResponse.json({ error: retry.error.message }, { status: 500 });
          }
        } else {
          agendamentosResult = retry.data;
        }
      } else {
        console.error('[api/agendamentos/admin] Erro ao salvar agendamento:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      agendamentosResult = agendamentos;
    }

    return NextResponse.json({ success: true, agendamento: agendamentosResult?.[0], projecoes: validPayloads.length });
  } catch (err) {
    console.error('[api/agendamentos/admin] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { 
      id, 
      cliente_id, 
      profissional_id, 
      servico_id, 
      sub_servicos, 
      data, 
      hora_inicio, 
      hora_fim, 
      status, 
      allow_overlap 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do agendamento é obrigatório.' }, { status: 400 });
    }

    let calculatedHoraFim = hora_fim;
    if (hora_inicio && (!calculatedHoraFim || calculatedHoraFim <= hora_inicio) && servico_id) {
      try {
        const { data: srvData } = await auth.supabase!
          .from('salon_services')
          .select('duration_minutes')
          .eq('id', servico_id)
          .maybeSingle();
        let totalMins = Number(srvData?.duration_minutes) || 60;
        if (Array.isArray(sub_servicos) && sub_servicos.length > 0) {
          const subIds = sub_servicos.map((s: any) => typeof s === 'string' ? s : s.id);
          const { data: subsData } = await auth.supabase!
            .from('salon_services')
            .select('duration_minutes')
            .in('id', subIds);
          if (subsData && subsData.length > 0) {
            totalMins += subsData.reduce((acc: number, cur: any) => acc + (Number(cur.duration_minutes) || 0), 0);
          }
        }
        const [h, m] = hora_inicio.split(':').map(Number);
        const endD = new Date(2000, 0, 1, h, m + totalMins);
        calculatedHoraFim = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
      } catch {
        calculatedHoraFim = hora_fim || hora_inicio;
      }
    }

    // Validação de conflito de horário (a menos que seja permitido encaixe ou que o agendamento conflitante permita sobreposição/pausa)
    if (data && hora_inicio && calculatedHoraFim && profissional_id && !allow_overlap) {
      const { data: allConflicts } = await auth.supabase!
        .from('salon_appointments')
        .select('*')
        .eq('professional_id', profissional_id)
        .eq('date', data)
        .neq('id', id)
        .neq('status', 'CANCELLED');

      const hasOverlap = (allConflicts || []).some((app: any) => {
        if (appointmentAllowsOverlap(app)) return false;
        const startA = hora_inicio;
        const endA = calculatedHoraFim;
        const startB = app.start_time;
        const endB = app.end_time;
        return startA < endB && endA > startB;
      });

      if (hasOverlap) {
        return NextResponse.json({ error: 'O novo horário selecionado conflita com outro agendamento existente deste profissional.' }, { status: 409 });
      }
    }

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (cliente_id) patch.customer_id = cliente_id;
    if (profissional_id) patch.professional_id = profissional_id;
    if (servico_id) patch.service_id = servico_id;
    if (data) patch.date = data;
    if (hora_inicio) patch.start_time = hora_inicio;
    if (calculatedHoraFim) patch.end_time = calculatedHoraFim;
    if (status) {
      let statusDb = 'CONFIRMED';
      const statusClean = String(status || '').toLowerCase();
      if (statusClean === 'pendente' || statusClean === 'pending') statusDb = 'PENDING';
      else if (statusClean === 'em_atendimento' || statusClean === 'in_progress') statusDb = 'IN_PROGRESS';
      else if (statusClean === 'concluido' || statusClean === 'completed') statusDb = 'COMPLETED';
      else if (statusClean === 'cancelado' || statusClean === 'cancelled') statusDb = 'CANCELLED';
      else if (statusClean === 'no_show') statusDb = 'NO_SHOW';
      patch.status = statusDb;
    }

    if (Array.isArray(sub_servicos) || allow_overlap !== undefined) {
      let subServicesFiltered = Array.isArray(sub_servicos)
        ? sub_servicos.filter((sub: any) =>
            typeof sub === 'string' ? sub.trim() !== '' : sub?.id?.trim() !== ''
          )
        : [];
      if (allow_overlap) {
        subServicesFiltered = [...subServicesFiltered.filter((s: any) => !s?._meta), { _meta: true, allow_overlap: true }];
      } else if (allow_overlap === false) {
        subServicesFiltered = subServicesFiltered.filter((s: any) => !s?._meta);
      }
      patch.sub_services = subServicesFiltered;
    }

    if (allow_overlap !== undefined) {
      patch.allow_overlap = Boolean(allow_overlap);
    }

    let updatedResult: any = null;
    const { data: updated, error } = await auth.supabase!
      .from('salon_appointments')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.message?.includes('sub_services') || error.message?.includes('allow_overlap')) {
        if (error.message?.includes('sub_services')) delete patch.sub_services;
        if (error.message?.includes('allow_overlap')) delete patch.allow_overlap;
        const retry = await auth.supabase!
          .from('salon_appointments')
          .update(patch)
          .eq('id', id)
          .select('*')
          .single();
        if (retry.error) {
          if (retry.error.message?.includes('sub_services') || retry.error.message?.includes('allow_overlap')) {
            delete patch.sub_services;
            delete patch.allow_overlap;
            const retry2 = await auth.supabase!
              .from('salon_appointments')
              .update(patch)
              .eq('id', id)
              .select('*')
              .single();
            if (retry2.error) {
              console.error('[api/agendamentos/admin] Erro ao atualizar agendamento (retry2):', retry2.error);
              return NextResponse.json({ error: retry2.error.message }, { status: 500 });
            }
            updatedResult = retry2.data;
          } else {
            console.error('[api/agendamentos/admin] Erro ao atualizar agendamento (retry):', retry.error);
            return NextResponse.json({ error: retry.error.message }, { status: 500 });
          }
        } else {
          updatedResult = retry.data;
        }
      } else {
        console.error('[api/agendamentos/admin] Erro ao atualizar agendamento:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      updatedResult = updated;
    }

    return NextResponse.json({ success: true, agendamento: updatedResult });
  } catch (err) {
    console.error('[api/agendamentos/admin] Erro no PUT:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}