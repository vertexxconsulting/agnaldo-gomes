import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { telefone, nome_noiva, data_agendamento, hora, status } = await req.json();

    if (!telefone || !data_agendamento || !hora) {
      return NextResponse.json({ error: 'Dados insuficientes para sincronizar.' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();
    
    // Status que queremos na agenda principal
    const statusDb = (status === 'confirmado' || status === 'sinal_pago') ? 'CONFIRMED' : 'PENDING';

    const telLimpo = telefone.replace(/\D/g, '');
    
    // 1. Tentar encontrar o cliente pelo telefone
    let { data: customer } = await supabase.from('salon_customers').select('id').eq('phone', telLimpo).maybeSingle();
    
    // 2. Fallback: buscar pelo nome
    if (!customer && nome_noiva) {
      const { data: customerByName } = await supabase.from('salon_customers').select('id').ilike('name', nome_noiva).maybeSingle();
      if (customerByName) customer = customerByName;
    }

    // Se achou o cliente, atualiza a agenda geral
    if (customer) {
      const { error } = await supabase.from('salon_appointments')
        .update({ status: statusDb })
        .eq('customer_id', customer.id)
        .eq('date', data_agendamento)
        .eq('start_time', hora);

      if (error) {
        console.error('[sync-agenda] Erro ao atualizar salon_appointments:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: true });
    } else {
      console.warn(`[sync-agenda] Cliente não encontrado para a noiva: ${nome_noiva} (${telefone})`);
      return NextResponse.json({ success: true, updated: false, message: 'Cliente não encontrado' });
    }
  } catch (err: any) {
    console.error('[sync-agenda] Erro inesperado:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
