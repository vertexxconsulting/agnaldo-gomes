import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cliente_id, profissional_id, servico_id, data, hora_inicio, hora_fim, status, canal, observacoes } = body;

    if (!cliente_id || !profissional_id || !servico_id || !data || !hora_inicio) {
      return NextResponse.json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();

    const insertPayload = {
      customer_id: cliente_id,
      professional_id: profissional_id,
      service_id: servico_id,
      date: data,
      start_time: hora_inicio,
      end_time: hora_fim || hora_inicio,
      status: (status || 'CONFIRMED').toUpperCase(),
      channel: (canal || 'RECEPTION').toUpperCase(),
      notes: observacoes || null,
    };

    const { data: agendamento, error } = await supabase
      .from('salon_appointments')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[api/agendamentos/admin] Erro ao salvar agendamento:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, agendamento });
  } catch (err: any) {
    console.error('[api/agendamentos/admin] Erro inesperado:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
