import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const data = searchParams.get('data');
    const profissional_id = searchParams.get('profissional_id');

    const supabase = await getSupabaseServiceClient();
    let query = supabase
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
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cliente_id, profissional_id, servico_id, data, hora_inicio, hora_fim, status, canal, observacoes } = body;

    if (!cliente_id || !profissional_id || !servico_id || !data || !hora_inicio) {
      return NextResponse.json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();

    const canalDb = (canal === 'online' || canal === 'ONLINE') ? 'ONLINE' : 'RECEPTION';
    
    let statusDb = 'CONFIRMED';
    const statusClean = String(status || '').toLowerCase();
    if (statusClean === 'pendente' || statusClean === 'pending') statusDb = 'PENDING';
    else if (statusClean === 'em_atendimento' || statusClean === 'in_progress') statusDb = 'IN_PROGRESS';
    else if (statusClean === 'concluido' || statusClean === 'completed') statusDb = 'COMPLETED';
    else if (statusClean === 'cancelado' || statusClean === 'cancelled') statusDb = 'CANCELLED';
    else if (statusClean === 'no_show') statusDb = 'NO_SHOW';

    const insertPayload = {
      customer_id: cliente_id,
      professional_id: profissional_id,
      service_id: servico_id,
      date: data,
      start_time: hora_inicio,
      end_time: hora_fim || hora_inicio,
      status: statusDb,
      channel: canalDb,
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
