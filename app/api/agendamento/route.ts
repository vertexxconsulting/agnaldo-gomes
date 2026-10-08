import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getWhatsAppBookingUrl } from '@/lib/whatsapp';
import { criarPixMercadoPago } from '@/lib/pagamentos-studio';
import { gerarPixCopiaCola } from '@/lib/noivas';
import { MOCK_SERVICOS, MOCK_PROFISSIONAIS } from '@/lib/mock-data';
import { sincronizarAgendamentoComBolten } from '@/lib/bolten';

function validateOrigin(req: Request): boolean {
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  if (!origin) return true; // Requisição direta da aplicação
  return (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('agnaldogomes.com') ||
    origin.includes('vercel.app')
  );
}

function sanitizeInput(input: string): string {
  return input.trim().slice(0, 500);
}

function validatePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  // Se usuário ou navegador enviou com DDI 55 (12 ou 13 dígitos), normaliza removendo o 55
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length < 10 || cleaned.length > 11) {
    throw new Error('Telefone inválido (deve conter DDD e número com 10 ou 11 dígitos)');
  }
  return cleaned;
}

function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('E-mail inválido');
  }
  return email.toLowerCase().slice(0, 254);
}

export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json(
      { error: 'Origem não permitida' },
      { status: 403 }
    );
  }

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

    if (!servicoId || !profissionalId || !data || !hora || !nome || !telefone) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios: servicoId, profissionalId, data, hora, nome, telefone' },
        { status: 400 }
      );
    }

    const nomeSanitizado = sanitizeInput(nome);
    const telefoneLimpo = validatePhone(telefone);
    const emailSanitizado = email ? validateEmail(email) : null;

    let clienteId = existingClienteId;

    // 1. Garantir que o cliente existe no Sistema Mãe (sem duplicar)
    if (supabase && nomeSanitizado && telefoneLimpo) {
      try {
        const { upsertClienteMae } = await import('@/lib/crm-sync');
        const clienteSalvo = await upsertClienteMae({
          id: clienteId,
          nome: nomeSanitizado,
          telefone: telefoneLimpo,
          email: emailSanitizado,
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
    if (isNaN(dataInicio.getTime())) {
      return NextResponse.json({ error: 'Data ou hora inválida' }, { status: 400 });
    }
    const dataFim = new Date(dataInicio.getTime() + servicoDuracao * 60000);
    const horaFim = isNaN(dataFim.getTime()) 
      ? hora 
      : `${String(dataFim.getHours()).padStart(2, '0')}:${String(dataFim.getMinutes()).padStart(2, '0')}`;

    // ── VALIDAÇÃO DE CONFLITO DE HORÁRIO ──
    // Verifica disponibilidade ANTES de inserir no banco
    if (supabase) {
      try {
        // 1. Conflito com agendamentos existentes (mesmo profissional, mesma data, horário sobreposto, status ativo)
        const { data: conflitos, error: conflictError } = await supabase
          .from('salon_appointments')
          .select('id, date, start_time, end_time, status')
          .eq('professional_id', profissionalId)
          .eq('date', data)
          .in('status', ['PENDING', 'CONFIRMED', 'IN_PROGRESS'])
          .lt('start_time', horaFim)   // appointment começa antes do nosso fim
          .gt('end_time', hora);       // appointment termina depois do nosso início

        if (!conflictError && conflitos && conflitos.length > 0) {
          console.warn(`[API Agendamento] Conflito de horário detectado:`, conflitos);
          return NextResponse.json(
            {
              error: 'Horário indisponível',
              message: `O profissional já possui ${conflitos.length} agendamento(s) neste horário.`,
              conflitos: conflitos.map(c => ({
                id: c.id,
                horario: `${c.start_time} - ${c.end_time}`,
                status: c.status,
              })),
            },
            { status: 409 }
          );
        }

        // 2. Conflito com bloqueios do profissional (férias, folga, intervalo)
        const { data: bloqueios, error: blockError } = await supabase
          .from('salon_schedule_blocks')
          .select('id, start_date, end_date, start_time, end_time, reason')
          .eq('professional_id', profissionalId)
          .lte('start_date', data)
          .gte('end_date', data);

        if (!blockError && bloqueios && bloqueios.length > 0) {
          // Verificar se algum bloqueio se sobrepõe ao horário solicitado
          const bloqueiosConflitantes = bloqueios.filter(b => {
            // Bloqueio de dia inteiro (sem horário específico)
            if (!b.start_time && !b.end_time) return true;
            // Bloqueio com horário: verificar sobreposição
            const blockStart = b.start_time || '00:00';
            const blockEnd = b.end_time || '23:59';
            return blockStart < horaFim && blockEnd > hora;
          });

          if (bloqueiosConflitantes.length > 0) {
            console.warn(`[API Agendamento] Bloqueio de agenda detectado:`, bloqueiosConflitantes);
            return NextResponse.json(
              {
                error: 'Horário indisponível',
                message: 'O profissional está com a agenda bloqueada neste horário.',
                bloqueios: bloqueiosConflitantes.map(b => ({
                  motivo: b.reason || 'Bloqueio de agenda',
                  periodo: b.start_time ? `${b.start_time} - ${b.end_time}` : 'Dia inteiro',
                })),
              },
              { status: 409 }
            );
          }
        }
      } catch (validationErr) {
        // Se a validação falhar (ex: tabela não existe), logar warning e prosseguir
        console.warn('[API Agendamento] ⚠️ Validação de conflito falhou, prosseguindo sem validação:', validationErr);
      }
    } else {
      console.warn('[API Agendamento] ⚠️ Supabase indisponível — pulando validação de conflito de horário');
    }

    // 3. Identificar se é Noivas (exige 50% de sinal obrigatório para garantir a data)
    const isNoiva = servicoCategoria === 'Noivas' || servicoCategoria === 'Dia da Noiva' || servicoNome.toLowerCase().includes('noiva');
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
          })
          .select('id')
          .single();

        if (agendamento) {
          agendamentoId = agendamento.id;

          // Espelhar na tabela específica de Noivas para aparecer no Dashboard "Dia da Noiva"
          console.log(`[API Agendamento] Verificando isNoiva:`, { isNoiva, servicoCategoria, servicoNome });
          if (isNoiva) {
            const { error: brideError } = await supabase.from('salon_bride_appointments').insert({
              pacote_id: servicoId,
              nome_noiva: nomeSanitizado,
              telefone: telefoneLimpo,
              email: emailSanitizado,
              data_evento: data,
              data_agendamento: data,
              hora: hora,
              profissional_id: profissionalId,
              status: 'sinal_pendente',
              sinal_percentual: 50,
              observacoes: 'Agendado pelo APP Público. Favor entrar em contato para marcar o teste e detalhes.',
            });
            if (brideError) {
              console.error('[API Agendamento] Falha ao espelhar noiva:', brideError);
            } else {
              console.log('[API Agendamento] Espelhado com sucesso na tabela salon_bride_appointments');
            }
          }

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
      nome: nomeSanitizado,
      telefone: telefoneLimpo,
      email: emailSanitizado,
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
          `Sinal 50% Noiva - ${nomeSanitizado.slice(0, 30)} - ${agendamentoId.slice(0, 8)}`
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

    // 6. Buscar o número de WhatsApp cadastrado para o salão
    let whatsappSalao = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '5542998271222';
    if (supabase) {
      try {
        const { data: lojaConfig } = await supabase
          .from('loja_settings')
          .select('whatsapp_contato')
          .eq('id', 1)
          .maybeSingle();

        if (lojaConfig?.whatsapp_contato && lojaConfig.whatsapp_contato.trim()) {
          whatsappSalao = lojaConfig.whatsapp_contato.trim();
        } else {
          const { data: sysSetting } = await supabase
            .from('salon_system_settings')
            .select('value')
            .in('key', ['whatsapp_contato', 'whatsapp_salao', 'whatsapp_atendimento'])
            .maybeSingle();
          if (sysSetting?.value && sysSetting.value.trim()) {
            whatsappSalao = sysSetting.value.trim();
          }
        }
      } catch (err) {
        console.warn('Aviso ao consultar WhatsApp cadastrado para o salão:', err);
      }
    }

    // Gerar URL do WhatsApp direcionando para o número do salão
    const whatsappUrl = getWhatsAppBookingUrl({
      id: agendamentoId,
      cliente: nomeSanitizado,
      telefone: telefoneLimpo,
      servico: servicoNome,
      profissional: profissionalNome,
      data: new Date(data).toLocaleDateString('pt-BR'),
      hora: hora,
      valor: valorTotal,
      isNoiva,
      valorSinal,
      whatsappDestino: whatsappSalao,
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
      nome: nomeSanitizado,
      whatsappUrl,
      whatsappSalao
    });

  } catch (error: any) {
    console.error('Erro na API de agendamento:', error);
    const message = error.message || 'Erro ao processar agendamento';
    const status = error.status || (message.includes('inválido') ? 400 : 500);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}