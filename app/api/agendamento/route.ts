import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getWhatsAppBookingUrl } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    // Rota pública (visitante sem sessão) — usa service role para bypass de RLS
    const supabase = await getSupabaseServiceClient();
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
        .eq('phone', numLimpo)
        .maybeSingle();

      if (searchError && searchError.code !== 'PGRST116') {
        throw searchError;
      }

      if (cliente) {
        clienteId = cliente.id;
      } else {
        const { data: novoCliente, error: createError } = await supabase
          .from('salon_customers')
          .insert({
            name: nome,
            phone: numLimpo,
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
      supabase.from('salon_services').select('name, price, duration_minutes').eq('id', servicoId).single(),
      supabase.from('salon_professionals').select('name').eq('id', profissionalId).single()
    ]);

    if (!servico || !profissional) {
      throw new Error('Serviço ou Profissional não encontrado');
    }

    // Calcular hora_fim baseado na duração do serviço
    const [h, m] = hora.split(':').map(Number);
    const dataInicio = new Date(`${data}T${hora}:00`);
    const dataFim = new Date(dataInicio.getTime() + servico.duration_minutes * 60000);
    const horaFim = `${String(dataFim.getHours()).padStart(2, '0')}:${String(dataFim.getMinutes()).padStart(2, '0')}`;

    // 3. Criar o agendamento como PENDENTE
    const { data: agendamento, error: bookingError } = await supabase
      .from('salon_appointments')
      .insert({
        customer_id: clienteId,
        professional_id: profissionalId,
        service_id: servicoId,
        date: data,
        start_time: hora,
        end_time: horaFim,
        status: 'PENDING',
        channel: 'ONLINE',
      })
      .select('id')
      .single();

    if (bookingError) throw bookingError;

    // 4. Gerar URL do WhatsApp
    const whatsappUrl = getWhatsAppBookingUrl({
      id: agendamento.id,
      cliente: nome,
      telefone: telefone,
      servico: servico.name,
      profissional: profissional.name,
      data: new Date(data).toLocaleDateString('pt-BR'),
      hora: hora,
      valor: Number(servico.price),
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
