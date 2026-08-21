import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getWhatsAppBookingUrl } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const body = await req.json();
    const { 
      servicoId, 
      profissionalId, 
      data, 
      hora, 
      nome, 
      telefone, 
      email,
      clienteId: existingClienteId 
    } = body;

    let clienteId = existingClienteId;

    // 1. Garantir que o cliente existe
    if (!clienteId) {
      const numLimpo = telefone.replace(/\D/g, '');
      const { data: cliente, error: searchError } = await supabase
        .from('salon_customers')
        .select('id')
        .eq('telefone', numLimpo)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (cliente) {
        clienteId = cliente.id;
      } else {
        const { data: novoCliente, error: createError } = await supabase
          .from('salon_customers')
          .insert({
            nome,
            telefone: numLimpo,
            email: email || null,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        clienteId = novoCliente.id;
      }
    }

    // 2. Buscar detalhes do serviço e profissional para a mensagem
    const [
      { data: servico },
      { data: profissional }
    ] = await Promise.all([
      supabase.from('salon_services').select('nome, preco, duracao_min').eq('id', servicoId).single(),
      supabase.from('salon_professionals').select('nome').eq('id', profissionalId).single()
    ]);

    if (!servico || !profissional) {
      throw new Error('Serviço ou Profissional não encontrado');
    }

    // Calcular hora_fim baseado na duração do serviço
    const [h, m] = hora.split(':').map(Number);
    const dataInicio = new Date(`${data}T${hora}:00`);
    const dataFim = new Date(dataInicio.getTime() + servico.duracao_min * 60000);
    const horaFim = `${String(dataFim.getHours()).padStart(2, '0')}:${String(dataFim.getMinutes()).padStart(2, '0')}`;

    // 3. Criar o agendamento como PENDENTE
    const { data: agendamento, error: bookingError } = await supabase
      .from('salon_appointments')
      .insert({
        cliente_id: clienteId,
        profissional_id: profissionalId,
        servico_id: servicoId,
        data,
        hora_inicio: hora,
        hora_fim: horaFim,
        status: 'pendente',
        canal: 'online',
      })
      .select('id')
      .single();

    if (bookingError) throw bookingError;

    // 4. Gerar URL do WhatsApp
    const whatsappUrl = getWhatsAppBookingUrl({
      id: agendamento.id,
      cliente: nome,
      telefone: telefone,
      servico: servico.nome,
      profissional: profissional.nome,
      data: new Date(data).toLocaleDateString('pt-BR'),
      hora: hora,
      valor: servico.preco,
    });

    return NextResponse.json({ 
      success: true, 
      id: agendamento.id, 
      whatsappUrl 
    });

  } catch (error: any) {
    console.error('Erro na API de agendamento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
