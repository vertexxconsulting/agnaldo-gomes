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
    
    // 1. Buscar Cliente pelo CPF
    const { data: cliente, error: cliError } = await supabase
      .from('salon_customers')
      .select('id, name, cpf, email, address, phone')
      .eq('cpf', cpf)
      .maybeSingle();

    if (cliError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado com este CPF', cliente: null });
    }

    // 2. Buscar agendamentos recentes do cliente (status: concluido ou pendente com pagamento já feito, mas vamos puxar todos ordenados por data)
    const { data: agendamentos, error: agError } = await supabase
      .from('salon_appointments')
      .select('id, date, start_time, service_id, professional_id, status')
      .eq('customer_id', cliente.id)
      .order('date', { ascending: false })
      .limit(5);

    // Mapear detalhes dos serviços
    const servicosFormatados = (agendamentos || []).map((ag: any) => {
      // Mock lookup para simplificar no MVP (ideal seria um JOIN com salon_services)
      const mockServico = MOCK_SERVICOS.find(s => s.id === ag.service_id);
      const mockProfissional = MOCK_PROFISSIONAIS.find(p => p.id === ag.professional_id);

      return {
        id: ag.id,
        data: ag.date,
        hora: ag.start_time,
        servico: mockServico?.nome || 'Serviço Personalizado',
        profissional: mockProfissional?.nome || 'Profissional',
        valor: mockServico?.preco || 0,
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
