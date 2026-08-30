import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getWhatsAppBookingUrl } from '@/lib/whatsapp';
import { criarPixMercadoPago } from '@/lib/pagamentos-studio';
import { gerarPixCopiaCola } from '@/lib/noivas';
import { MOCK_SERVICOS, MOCK_PROFISSIONAIS } from '@/lib/mock-data';
import { sincronizarAgendamentoComBolten } from '@/lib/bolten';

export async function POST(req: Request) {
  try {
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
    const numLimpo = (telefone || '').replace(/\D/g, '');

    // 1. Garantir que o cliente existe no Sistema Mãe (sem duplicar)
    if (supabase && nome && numLimpo) {
      try {
        const { upsertClienteMae } = await import('@/lib/crm-sync');
        const clienteSalvo = await upsertClienteMae({
          id: clienteId,
          nome,
          telefone: numLimpo,
          email,
        });
        if (clienteSalvo) clienteId = clienteSalvo.id;
      } catch (err) {
        console.warn('Fallback CRM cliente:', err);
      }
    }

    // 2. Buscar detalhes do serviço e profissional (do Supabase ou Fallback Mock)
    let servicoNome = 'Serviço do Salão';
    let servicoCategoria = '';
    let servicoPreco = 50;
    let servicoDuracao = 30;
    let profissionalNome = 'Qualquer Especialista';

    if (supabase) {
      const [srvRes, profRes] = await Promise.all([
        supabase.from('salon_services').select('name, category, price, duration_minutes').eq('id', servicoId).maybeSingle(),
        supabase.from('salon_professionals').select('name').eq('id', profissionalId).maybeSingle()
      ]);
      if (srvRes?.data) {
        servicoNome = srvRes.data.name;
        servicoCategoria = srvRes.data.category || '';
        servicoPreco = Number(srvRes.data.price);
        servicoDuracao = Number(srvRes.data.duration_minutes) || 30;
      }
      if (profRes?.data) {
        profissionalNome = profRes.data.name;
      }
    }

    // Fallback se não achou no banco
    if (!servicoNome || servicoNome === 'Serviço do Salão') {
      const mockSrv = MOCK_SERVICOS.find(s => s.id === servicoId);
      if (mockSrv) {
        servicoNome = mockSrv.nome;
        servicoCategoria = mockSrv.categoria;
        servicoPreco = mockSrv.preco;
        servicoDuracao = mockSrv.duracao_min;
      }
    }
    if (!profissionalNome || profissionalNome === 'Qualquer Especialista') {
      const mockProf = MOCK_PROFISSIONAIS.find(p => p.id === profissionalId);
      if (mockProf) {
        profissionalNome = mockProf.nome;
      }
    }

    // Calcular hora_fim
    const dataInicio = new Date(`${data}T${hora}:00`);
    const dataFim = new Date(dataInicio.getTime() + servicoDuracao * 60000);
    const horaFim = isNaN(dataFim.getTime()) 
      ? hora 
      : `${String(dataFim.getHours()).padStart(2, '0')}:${String(dataFim.getMinutes()).padStart(2, '0')}`;

    // 3. Identificar se é Noivas (exige 50% de sinal obrigatório para garantir a data)
    const isNoiva = servicoCategoria === 'Noivas' || servicoNome.toLowerCase().includes('noiva');
    const valorTotal = servicoPreco;
    const valorSinal = isNoiva ? Math.round(valorTotal * 0.5 * 100) / 100 : 0;

    let agendamentoId = `ag-${Date.now()}`;

    // Salvar no Supabase se disponível
    if (supabase && clienteId) {
      try {
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
            notes: isNoiva ? `Sinal de 50% obrigatório: R$ ${valorSinal.toFixed(2)} (Total: R$ ${valorTotal.toFixed(2)})` : null
          })
          .select('id')
          .single();

        if (agendamento) {
          agendamentoId = agendamento.id;
        } else if (bookingError) {
          console.warn('Aviso ao criar agendamento no banco:', bookingError);
        }
      } catch (err) {
        console.warn('Erro ao inserir salon_appointments:', err);
      }
    }

    // 4. Sincronizar dados com o CRM Bolten.io (em background, sem travar o cliente)
    sincronizarAgendamentoComBolten({
      id: agendamentoId,
      nome,
      telefone,
      email,
      servico: servicoNome,
      profissional: profissionalNome,
      data,
      hora,
      valor: valorTotal,
      isNoiva
    }).catch(err => console.warn('[bolten-sync] Falha assíncrona:', err));

    // 5. Gerar PIX se for Noiva
    let pixCopiaCola = '';
    let qrcodeBase64 = '';
    let isRealPix = false;

    if (isNoiva) {
      try {
        const pixRes = await criarPixMercadoPago(
          valorSinal,
          `Sinal 50% Noiva - ${nome.slice(0, 30)} - ${agendamentoId.slice(0, 8)}`
        );
        pixCopiaCola = pixRes.copia_e_cola;
        qrcodeBase64 = pixRes.qrcode_base64;
        isRealPix = pixRes.real;
      } catch (err) {
        console.warn('Mercado Pago não configurado ou indisponível, gerando PIX padrão:', err);
        pixCopiaCola = gerarPixCopiaCola(valorSinal, `Sinal Noiva ${agendamentoId.slice(0, 10)}`);
        isRealPix = false;
      }
    }

    // 5. Gerar URL do WhatsApp
    const whatsappUrl = getWhatsAppBookingUrl({
      id: agendamentoId,
      cliente: nome,
      telefone: telefone,
      servico: servicoNome,
      profissional: profissionalNome,
      data: new Date(data).toLocaleDateString('pt-BR'),
      hora: hora,
      valor: valorTotal,
      isNoiva,
      valorSinal
    });

    return NextResponse.json({ 
      success: true, 
      id: agendamentoId,
      isNoiva,
      valorTotal,
      valorSinal,
      pixCopiaCola,
      qrcodeBase64,
      isRealPix,
      servico: servicoNome,
      profissional: profissionalNome,
      data,
      hora,
      nome,
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
