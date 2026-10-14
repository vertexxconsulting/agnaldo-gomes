import { NextRequest, NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { MOCK_SERVICOS, MOCK_PROFISSIONAIS } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  const cpf = req.nextUrl.searchParams.get('cpf');
  if (!cpf) {
    return NextResponse.json({ error: 'CPF é obrigatório' }, { status: 400 });
  }

  try {
    const supabase = auth.supabase!;
    
    // 1. Buscar Cliente pelo CPF (tenta com e sem formatação)
    const cpfLimpo = cpf.replace(/\D/g, '');
    const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

    const { data: cliente, error: cliError } = await supabase
      .from('salon_customers')
      .select('id, name, cpf, email, address, phone')
      .or(`cpf.eq.${cpfLimpo},cpf.eq.${cpfFormatado}`)
      .maybeSingle();

    if (cliError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado com este CPF', cliente: null });
    }

    // 2. Buscar agendamentos recentes do cliente
    const { data: agendamentos, error: agError } = await supabase
      .from('salon_appointments')
      .select('id, date, start_time, service_id, professional_id, status, total_amount, payment_method, sub_services')
      .eq('customer_id', cliente.id)
      .order('date', { ascending: false })
      .limit(10);

    if (agError) {
      console.error('[api/admin/notas/buscar] Erro ao buscar agendamentos:', agError);
    }

    // Buscar dados reais das tabelas salon_services e salon_professionals
    const serviceIds = Array.from(new Set((agendamentos || []).map((ag: any) => ag.service_id).filter(Boolean)));
    const professionalIds = Array.from(new Set((agendamentos || []).map((ag: any) => ag.professional_id).filter(Boolean)));

    let dbServices: any[] = [];
    if (serviceIds.length > 0) {
      const { data: srvs } = await supabase
        .from('salon_services')
        .select('id, name, price')
        .in('id', serviceIds);
      if (srvs) dbServices = srvs;
    }

    let dbProfessionals: any[] = [];
    if (professionalIds.length > 0) {
      const { data: profs } = await supabase
        .from('salon_professionals')
        .select('id, name')
        .in('id', professionalIds);
      if (profs) dbProfessionals = profs;
    }

    // Mapear detalhes dos serviços priorizando dados reais
    const servicosFormatados = (agendamentos || []).map((ag: any) => {
      const dbServico = dbServices.find(s => s.id === ag.service_id);
      const mockServico = MOCK_SERVICOS.find(s => s.id === ag.service_id);
      const dbProf = dbProfessionals.find(p => p.id === ag.professional_id);
      const mockProf = MOCK_PROFISSIONAIS.find(p => p.id === ag.professional_id);

      const nomeServico = dbServico?.name || mockServico?.nome || 'Serviço Personalizado';
      const nomeProf = dbProf?.name || mockProf?.nome || 'Profissional';
      
      const valor = (ag.total_amount != null && Number(ag.total_amount) > 0)
        ? Number(ag.total_amount)
        : (dbServico?.price != null && Number(dbServico.price) > 0)
          ? Number(dbServico.price)
          : (mockServico?.preco || 0);

      return {
        id: ag.id,
        data: ag.date,
        hora: ag.start_time ? ag.start_time.slice(0, 5) : '',
        servico: nomeServico,
        profissional: nomeProf,
        valor: valor,
        payment_method: ag.payment_method || null,
        status: ag.status
      };
    });

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        nome: cliente.name,
        cpf: cliente.cpf,
        email: cliente.email,
        endereco: cliente.address,
        telefone: cliente.phone,
      },
      servicos: servicosFormatados
    });
  } catch (err: any) {
    console.error('[api/admin/notas/buscar] Erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
