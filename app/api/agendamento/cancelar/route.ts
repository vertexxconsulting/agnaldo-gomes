import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getWhatsAppCancelUrl } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const body = await req.json();
    const { id, motivo, reagendamentoRecusado } = body;

    // 1. Buscar detalhes do agendamento para a notificação
    const { data: agendamento, error: fetchError } = await supabase
      .from('salon_appointments')
      .select(`
        *,
        cliente:salon_customers(nome, telefone),
        servico:salon_services(nome),
        profissional:salon_professionals(nome)
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
        status: 'cancelado',
        motivo_cancelamento: motivo,
        cancelado_em: new Date().toISOString(),
        reagendamento_proposto: reagendamentoRecusado ? true : false
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Gerar URL do WhatsApp para notificar o Studio
    const whatsappUrl = getWhatsAppCancelUrl({
      id: agendamento.id,
      cliente: agendamento.cliente.nome,
      telefone: agendamento.cliente.telefone,
      servico: agendamento.servico.nome,
      profissional: agendamento.profissional.nome,
      data: new Date(agendamento.data).toLocaleDateString('pt-BR'),
      hora: agendamento.hora_inicio,
      valor: 0, // Não relevante no cancelamento
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
