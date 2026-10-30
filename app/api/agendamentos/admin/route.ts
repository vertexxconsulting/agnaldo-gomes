import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const supabase = await getSupabaseServiceClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const data = searchParams.get('data');
    const profissional_id = searchParams.get('profissional_id');
    const cliente_id = searchParams.get('cliente_id');
    const futuros_de = searchParams.get('futuros_de');

    if (id) {
      const { data: item, error: errItem } = await supabase
        .from('salon_appointments')
        .select(`
          *,
          cliente:salon_customers(id, name, phone, email),
          profissional:salon_professionals(id, name),
          servico:salon_services(id, name, price, duration_minutes)
        `)
        .eq('id', id)
        .maybeSingle();

      if (errItem) {
        return NextResponse.json({ error: errItem.message }, { status: 500 });
      }
      return NextResponse.json(item || null);
    }

    let query = supabase
      .from('salon_appointments')
      .select('*');

    if (futuros_de) {
      query = query.order('date', { ascending: true }).order('start_time');
    } else {
      query = query.order('date', { ascending: false }).order('start_time');
    }

    if (data) query = query.eq('date', data);
    if (profissional_id) query = query.eq('professional_id', profissional_id);
    if (cliente_id) query = query.eq('customer_id', cliente_id);
    if (futuros_de) {
      query = query.gt('date', futuros_de).not('status', 'in', '("CANCELLED","COMPLETED")');
    }

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
    const supabase = await getSupabaseServiceClient();
    const body = await req.json();
    const { 
      cliente_id, 
      profissional_id, 
      servico_id, 
      sub_servicos, 
      auxiliares_ids,
      data, 
      hora_inicio, 
      hora_fim, 
      status, 
      canal, 
      is_fixed, 
      recurrence_type, 
      recurrence_custom_day, 
      allow_overlap 
    } = body;

    if (!cliente_id || !profissional_id || !servico_id || !data || !hora_inicio) {
      return NextResponse.json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' }, { status: 400 });
    }

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

    const metaObj: Record<string, any> = { _meta: true };
    if (allow_overlap) metaObj.allow_overlap = true;
    if (Array.isArray(auxiliares_ids) && auxiliares_ids.length > 0) {
      metaObj.auxiliares_ids = auxiliares_ids;
    }
    
    if (allow_overlap || (Array.isArray(auxiliares_ids) && auxiliares_ids.length > 0)) {
      subServicesFiltered = [...subServicesFiltered.filter((s: any) => !s?._meta), metaObj];
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
      assistant_ids?: string[];
    }

    let calculatedHoraFim = hora_fim;
    if (!calculatedHoraFim || calculatedHoraFim <= hora_inicio) {
      try {
        const { data: srvData } = await supabase
          .from('salon_services')
          .select('duration_minutes')
          .eq('id', servico_id)
          .maybeSingle();
        let totalMins = Number(srvData?.duration_minutes) || 60;
        if (subServicesFiltered.length > 0) {
          const subIds = subServicesFiltered.filter((s: any) => !s?._meta).map((s: any) => typeof s === 'string' ? s : s.id);
          const { data: subsData } = await supabase
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

    if (Array.isArray(auxiliares_ids) && auxiliares_ids.length > 0) {
      firstPayload.assistant_ids = auxiliares_ids;
    }

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

    // 1. VALIDAÇÃO DE CONFLITO PARA TODAS AS DATAS GERADAS (TITULAR + AUXILIARES)
    const profsToCheck = [profissional_id, ...(Array.isArray(auxiliares_ids) ? auxiliares_ids : [])];
    const datesToCheck = payloads.map(p => p.date);
    const { data: allConflicts } = await supabase
      .from('salon_appointments')
      .select('*')
      .in('date', datesToCheck)
      .neq('status', 'CANCELLED');

    // Filtra apenas os payloads que NÃO conflitam com horários existentes
    const validPayloads = allow_overlap ? payloads : payloads.filter(p => {
      const conflictsForDate = allConflicts?.filter((c: any) => {
        if (c.date !== p.date) return false;
        const cAuxiliares = Array.isArray(c.assistant_ids) 
          ? c.assistant_ids 
          : (Array.isArray(c.sub_services) ? (c.sub_services.find((s: any) => s?._meta)?.auxiliares_ids || []) : []);
        const cAllProfs = [c.professional_id, ...cAuxiliares];
        return profsToCheck.some(pid => cAllProfs.includes(pid));
      }) || [];

      const hasOverlap = conflictsForDate.some((app: any) => {
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
      return NextResponse.json({ error: 'O horário selecionado (ou a agenda de um dos auxiliares) já está ocupado.' }, { status: 409 });
    }

    let agendamentosResult: any = null;
    const { data: agendamentos, error } = await supabase
      .from('salon_appointments')
      .insert(validPayloads)
      .select('*');

    if (error) {
      if (error.message?.includes('sub_services') || error.message?.includes('allow_overlap') || error.message?.includes('assistant_ids')) {
        const cleanPayloads = validPayloads.map(p => {
          const cp: any = { ...p };
          if (error.message?.includes('sub_services')) delete cp.sub_services;
          if (error.message?.includes('allow_overlap')) delete cp.allow_overlap;
          if (error.message?.includes('assistant_ids')) delete cp.assistant_ids;
          return cp;
        });
        const retry = await supabase
          .from('salon_appointments')
          .insert(cleanPayloads)
          .select('*');
        if (retry.error) {
          const cleanAll = cleanPayloads.map(p => {
            const cp: any = { ...p };
            delete cp.sub_services;
            delete cp.allow_overlap;
            delete cp.assistant_ids;
            return cp;
          });
          const retry2 = await supabase
            .from('salon_appointments')
            .insert(cleanAll)
            .select('*');
          if (retry2.error) {
            console.error('[api/agendamentos/admin] Erro ao salvar agendamento (retry2):', retry2.error);
            return NextResponse.json({ error: retry2.error.message }, { status: 500 });
          }
          agendamentosResult = retry2.data;
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
    const supabase = await getSupabaseServiceClient();
    const body = await req.json();
    const { 
      id, 
      cliente_id, 
      profissional_id, 
      servico_id, 
      sub_servicos, 
      auxiliares_ids,
      data, 
      hora_inicio, 
      hora_fim, 
      status, 
      allow_overlap,
      is_fixed,
      recurrence_type,
      recurrence_custom_day,
      replicate_to_future,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do agendamento é obrigatório.' }, { status: 400 });
    }

    let calculatedHoraFim = hora_fim;
    if (hora_inicio && (!calculatedHoraFim || calculatedHoraFim <= hora_inicio) && servico_id) {
      try {
        const { data: srvData } = await supabase
          .from('salon_services')
          .select('duration_minutes')
          .eq('id', servico_id)
          .maybeSingle();
        let totalMins = Number(srvData?.duration_minutes) || 60;
        if (Array.isArray(sub_servicos) && sub_servicos.length > 0) {
          const subIds = sub_servicos.map((s: any) => typeof s === 'string' ? s : s.id);
          const { data: subsData } = await supabase
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

    // Validação de conflito de horário (considerando titular + auxiliares, se não for encaixe)
    if (data && hora_inicio && calculatedHoraFim && profissional_id && !allow_overlap) {
      const profsToCheck = [profissional_id, ...(Array.isArray(auxiliares_ids) ? auxiliares_ids : [])];
      const { data: allConflicts } = await supabase
        .from('salon_appointments')
        .select('*')
        .eq('date', data)
        .neq('id', id)
        .neq('status', 'CANCELLED');

      const hasOverlap = (allConflicts || []).some((app: any) => {
        if (appointmentAllowsOverlap(app)) return false;
        const cAuxiliares = Array.isArray(app.assistant_ids) 
          ? app.assistant_ids 
          : (Array.isArray(app.sub_services) ? (app.sub_services.find((s: any) => s?._meta)?.auxiliares_ids || []) : []);
        const cAllProfs = [app.professional_id, ...cAuxiliares];
        const temProfissionalComum = profsToCheck.some(pid => cAllProfs.includes(pid));
        if (!temProfissionalComum) return false;

        const startA = hora_inicio;
        const endA = calculatedHoraFim;
        const startB = app.start_time;
        const endB = app.end_time;
        return startA < endB && endA > startB;
      });

      if (hasOverlap) {
        return NextResponse.json({ error: 'O novo horário selecionado conflita com outro agendamento existente deste profissional ou de um dos auxiliares.' }, { status: 409 });
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
    if (auxiliares_ids !== undefined) {
      patch.assistant_ids = Array.isArray(auxiliares_ids) ? auxiliares_ids : [];
    }
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

    if (body.payment_method !== undefined) patch.payment_method = body.payment_method;
    if (body.installments !== undefined) patch.installments = body.installments;
    if (body.total_amount !== undefined) patch.total_amount = body.total_amount;
    if (body.product_cost !== undefined) patch.product_cost = body.product_cost;

    if (Array.isArray(sub_servicos) || allow_overlap !== undefined || auxiliares_ids !== undefined) {
      let subServicesFiltered = Array.isArray(sub_servicos)
        ? sub_servicos.filter((sub: any) =>
            typeof sub === 'string' ? sub.trim() !== '' : sub?.id?.trim() !== ''
          )
        : [];

      const existingMeta = Array.isArray(sub_servicos) ? sub_servicos.find((s: any) => s?._meta) : null;
      const metaObj: Record<string, any> = existingMeta ? { ...existingMeta } : { _meta: true };
      if (allow_overlap !== undefined) metaObj.allow_overlap = Boolean(allow_overlap);
      if (auxiliares_ids !== undefined) metaObj.auxiliares_ids = Array.isArray(auxiliares_ids) ? auxiliares_ids : [];

      subServicesFiltered = [...subServicesFiltered.filter((s: any) => !s?._meta), metaObj];
      patch.sub_services = subServicesFiltered;
    }

    if (allow_overlap !== undefined) {
      patch.allow_overlap = Boolean(allow_overlap);
    }
    if (is_fixed !== undefined) {
      patch.is_fixed = Boolean(is_fixed);
    }
    if (recurrence_type !== undefined) {
      patch.recurrence_type = recurrence_type || null;
    }
    if (recurrence_custom_day !== undefined) {
      patch.recurrence_custom_day = recurrence_custom_day ? parseInt(recurrence_custom_day) : null;
    }

    let updatedResult: any = null;
    const { data: updated, error } = await supabase
      .from('salon_appointments')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.message?.includes('sub_services') || error.message?.includes('allow_overlap') || error.message?.includes('assistant_ids')) {
        if (error.message?.includes('sub_services')) delete patch.sub_services;
        if (error.message?.includes('allow_overlap')) delete patch.allow_overlap;
        if (error.message?.includes('assistant_ids')) delete patch.assistant_ids;

        const retry = await supabase
          .from('salon_appointments')
          .update(patch)
          .eq('id', id)
          .select('*')
          .single();
        if (retry.error) {
          delete patch.sub_services;
          delete patch.allow_overlap;
          delete patch.assistant_ids;
          const retry2 = await supabase
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
          updatedResult = retry.data;
        }
      } else {
        console.error('[api/agendamentos/admin] Erro ao atualizar agendamento:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      updatedResult = updated;
    }

    // Replicar ajuste de serviço para agendamentos futuros do cliente recorrente
    let futurosAtualizados = 0;
    if (replicate_to_future && cliente_id && data && servico_id) {
      try {
        let futureQuery = supabase
          .from('salon_appointments')
          .select('id, date, start_time, end_time, status, professional_id')
          .eq('customer_id', cliente_id)
          .gt('date', data)
          .not('status', 'in', '("CANCELLED","COMPLETED")');

        if (profissional_id) {
          futureQuery = futureQuery.eq('professional_id', profissional_id);
        }

        const { data: futureAppts, error: errFut } = await futureQuery;

        if (!errFut && futureAppts && futureAppts.length > 0) {
          // Duração do novo procedimento (serviço principal + sub_serviços)
          let serviceDurationMin = 60;
          try {
            const { data: srvData } = await supabase
              .from('salon_services')
              .select('duration_minutes')
              .eq('id', servico_id)
              .maybeSingle();
            serviceDurationMin = Number(srvData?.duration_minutes) || 60;

            if (Array.isArray(sub_servicos) && sub_servicos.length > 0) {
              const subIds = sub_servicos
                .filter((s: any) => !s?._meta)
                .map((s: any) => typeof s === 'string' ? s : s.id);
              if (subIds.length > 0) {
                const { data: subsData } = await supabase
                  .from('salon_services')
                  .select('duration_minutes')
                  .in('id', subIds);
                if (subsData && subsData.length > 0) {
                  serviceDurationMin += subsData.reduce((acc: number, cur: any) => acc + (Number(cur.duration_minutes) || 0), 0);
                }
              }
            }
          } catch {
            // fallback para duração padrão
          }

          for (const fut of futureAppts) {
            let futEndTime = fut.end_time;
            if (fut.start_time && serviceDurationMin > 0) {
              const [fH, fM] = fut.start_time.slice(0, 5).split(':').map(Number);
              const endD = new Date(2000, 0, 1, fH, fM + serviceDurationMin);
              futEndTime = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
            }

            const futurePatch: Record<string, any> = {
              service_id: servico_id,
              end_time: futEndTime,
              updated_at: new Date().toISOString()
            };

            if (patch.sub_services !== undefined) {
              futurePatch.sub_services = patch.sub_services;
            }
            if (patch.assistant_ids !== undefined) {
              futurePatch.assistant_ids = patch.assistant_ids;
            }

            const { error: errUpdateFut } = await supabase
              .from('salon_appointments')
              .update(futurePatch)
              .eq('id', fut.id);

            if (!errUpdateFut) {
              futurosAtualizados++;
            }
          }
        }
      } catch (errRep) {
        console.error('[api/agendamentos/admin] Erro ao replicar para futuros:', errRep);
      }
    }

    return NextResponse.json({ 
      success: true, 
      agendamento: updatedResult, 
      futuros_atualizados: futurosAtualizados 
    });
  } catch (err) {
    console.error('[api/agendamentos/admin] Erro no PUT:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const supabase = await getSupabaseServiceClient();
    const url = new URL(req.url);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // fallback caso corpo seja vazio
    }

    const id = body.id || url.searchParams.get('id');
    const modo = body.modo || url.searchParams.get('modo') || 'apenas_dia';
    const excluirAtual = Boolean(body.excluir_atual);

    if (!id) {
      return NextResponse.json({ error: 'ID do agendamento é obrigatório' }, { status: 400 });
    }

    // 1. Obter os dados do agendamento atual
    const { data: appt, error: errAppt } = await supabase
      .from('salon_appointments')
      .select('id, customer_id, date, status, professional_id')
      .eq('id', id)
      .maybeSingle();

    if (errAppt || !appt) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const agora = new Date().toISOString();
    let cancelados = 0;
    let excluidos = 0;
    const idsParaBolten: string[] = [];

    // Buscar agendamentos futuros do mesmo cliente se o modo afetar futuros
    let futureAppts: Array<{ id: string; date: string }> = [];
    if (appt.customer_id && appt.date && (modo === 'cancelar_futuros' || modo === 'excluir_futuros' || modo === 'excluir_tudo')) {
      const { data: futs } = await supabase
        .from('salon_appointments')
        .select('id, date, status')
        .eq('customer_id', appt.customer_id)
        .gt('date', appt.date)
        .not('status', 'in', '("COMPLETED")');

      futureAppts = futs || [];
    }

    const futureIds = futureAppts.map(f => f.id);

    if (modo === 'apenas_dia') {
      if (excluirAtual) {
        const { error: errDel } = await supabase
          .from('salon_appointments')
          .delete()
          .eq('id', id);
        if (errDel) throw errDel;
        excluidos++;
      } else {
        const { error: errUp } = await supabase
          .from('salon_appointments')
          .update({ status: 'CANCELLED', cancelado_em: agora })
          .eq('id', id);
        if (errUp) throw errUp;
        cancelados++;
        idsParaBolten.push(id);
      }
    } else if (modo === 'cancelar_futuros') {
      // 1. Atualizar agendamento atual
      if (excluirAtual) {
        await supabase.from('salon_appointments').delete().eq('id', id);
        excluidos++;
      } else {
        await supabase.from('salon_appointments').update({ status: 'CANCELLED', cancelado_em: agora }).eq('id', id);
        cancelados++;
        idsParaBolten.push(id);
      }

      // 2. Cancelar agendamentos futuros
      if (futureIds.length > 0) {
        const { error: errFut } = await supabase
          .from('salon_appointments')
          .update({ status: 'CANCELLED', cancelado_em: agora })
          .in('id', futureIds);
        if (errFut) throw errFut;
        cancelados += futureIds.length;
        idsParaBolten.push(...futureIds);
      }
    } else if (modo === 'excluir_futuros') {
      // 1. Atualizar agendamento atual (marcar como cancelado ou excluir)
      if (excluirAtual) {
        await supabase.from('salon_appointments').delete().eq('id', id);
        excluidos++;
      } else {
        await supabase.from('salon_appointments').update({ status: 'CANCELLED', cancelado_em: agora }).eq('id', id);
        cancelados++;
        idsParaBolten.push(id);
      }

      // 2. Excluir da grade todos os agendamentos futuros
      if (futureIds.length > 0) {
        const { error: errDelFut } = await supabase
          .from('salon_appointments')
          .delete()
          .in('id', futureIds);
        if (errDelFut) throw errDelFut;
        excluidos += futureIds.length;
      }
    } else if (modo === 'excluir_tudo') {
      const allIds = [id, ...futureIds];
      const { error: errDelAll } = await supabase
        .from('salon_appointments')
        .delete()
        .in('id', allIds);
      if (errDelAll) throw errDelAll;
      excluidos += allIds.length;
    }

    // Sincronizar status cancelado com Bolten em background
    if (idsParaBolten.length > 0) {
      Promise.all(idsParaBolten.map(async (bId) => {
        try {
          await fetch(`${url.origin}/api/bolten/sync-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agendamentoId: bId, status: 'cancelado' }),
          });
        } catch {}
      })).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      modo,
      cancelados,
      excluidos,
      future_count: futureIds.length,
    });
  } catch (err: any) {
    console.error('[api/agendamentos/admin DELETE] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar cancelamento/exclusão' }, { status: 500 });
  }
}
