import { NextRequest, NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { createOrUpdateAsaasCustomer, createAsaasPayment, scheduleAsaasInvoice, ASAAS_API_KEY } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { clienteId, agendamentoId, valor } = await req.json();

    if (!clienteId || !agendamentoId || !valor) {
      return NextResponse.json({ error: 'Dados incompletos para emissão' }, { status: 400 });
    }

    const supabase = auth.supabase!;

    // 1. Obter dados completos do cliente
    const { data: cliente, error: cliError } = await supabase
      .from('salon_customers')
      .select('*')
      .eq('id', clienteId)
      .single();

    if (cliError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado no banco' }, { status: 404 });
    }

    if (!cliente.cpf || !cliente.address) {
      return NextResponse.json({ error: 'O cliente precisa ter CPF e Endereço cadastrados para emitir nota.' }, { status: 400 });
    }

    // Se não tivermos a chave configurada real, simulamos sucesso (Modo Teste)
    if (!ASAAS_API_KEY || ASAAS_API_KEY.includes('sua_api_key')) {
      console.log('Simulando emissão de NF via Asaas (API Key não configurada)');
      // Delay simulando request
      await new Promise(r => setTimeout(r, 1500));
      return NextResponse.json({ success: true, message: 'Nota simulada com sucesso (Falta API Key)', mockup: true });
    }

    // Fluxo Real Asaas
    // 1. Criar/Atualizar Cliente no Asaas
    const asaasCustomerId = await createOrUpdateAsaasCustomer({
      name: cliente.name,
      cpfCnpj: cliente.cpf,
      email: cliente.email || undefined,
      phone: cliente.phone,
      address: cliente.address,
    });

    // 2. Criar uma cobrança recebida em dinheiro (UNDEFINED) para atrelar a nota
    // Já que o cliente provavelmente já pagou por outro meio presencial.
    const payment = await createAsaasPayment({
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // recebido em dinheiro/presencial
      value: Number(valor),
      dueDate: new Date().toISOString().split('T')[0],
      description: `Referente ao agendamento ${agendamentoId}`,
    });

    // Como é 'UNDEFINED', o Asaas geralmente o deixa como recebido ou pendente. 
    // Para emitir a nota, é necessário que a cobrança exista.
    
    // 3. Agendar a Nota Fiscal (NFS-e)
    const invoice = await scheduleAsaasInvoice({
      payment: payment.id,
      type: 'NFS-E',
      updatePayment: false, // não alterar status do pagamento
      // Os códigos abaixo são exemplos e devem ser parametrizados depois com a prefeitura
      municipalServiceId: '1234', 
      municipalServiceCode: '06.01', // Cabeleireiros, manicuros, pedicuros.
      municipalServiceName: 'Serviços de Salão de Beleza',
    });

    return NextResponse.json({ success: true, invoice });

  } catch (err: any) {
    console.error('[api/admin/notas/emitir] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro interno na emissão' }, { status: 500 });
  }
}
