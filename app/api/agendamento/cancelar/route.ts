import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getWhatsAppCancelUrl } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    // Rota pública (links do WhatsApp sem sessão) — usa service role para bypass de RLS
    const supabase = await getSupabaseServiceClient();
    const body = await req.json();
    const { id, motivo, reagendamentoRecusado } = body;

    // 1. Buscar detalhes do agendamento para a notificação
    const { data: agendamento, error: fetchError } = await supabase
      .from('salon_appointments')
      .select(`
        *,
        cliente:salon_customers(id, name, phone),
        servico:salon_services(id, name, price),
        profissional:salon_professionals(id, name)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    // 2. Atualizar status no banco
    const { error: updateError } = await supabase
      .from('salon_appointments')
      .update({
        status: 'CANCELLED',
        motivo_cancelamento: motivo,
        cancelado_em: new Date().toISOString(),
        reagendamento_proposto: reagendamentoRecusado ? true : false
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Gerar URL do WhatsApp para notificar o Studio
    const whatsappUrl = getWhatsAppCancelUrl({
      id: agendamento.id,
      cliente: agendamento.cliente?.name ?? '',
      telefone: agendamento.cliente?.phone ?? '',
      servico: agendamento.servico?.name ?? '',
      profissional: agendamento.profissional?.name ?? '',
      data: new Date(agendamento.date).toLocaleDateString('pt-BR'),
      hora: (agendamento.start_time ?? '').slice(0, 5),
      valor: Number(agendamento.servico?.price ?? 0),
    }, motivo);

    return NextResponse.json({ 
      success: true, 
      whatsappUrl 
    });

  } catch (error: any) {
    console.error('Erro na API de cancelamento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
