import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Webhook do Asaas para LOJA e ACADEMY
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const event = payload.event;
    const payment = payload.payment;

    if (!payment || !payment.externalReference) {
      return NextResponse.json({ received: true, ignored: true, reason: 'Missing externalReference' });
    }

    console.log(`[asaas-webhook] Recebido event=${event}, ref=${payment.externalReference}`);

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const supabase = await getSupabaseServerClient();
      const ref = payment.externalReference;

      // 1. Verificar se é compra do ACADEMY
      if (ref.startsWith('academy-')) {
        // Ex: academy-{cursoId}-{email}
        // Marcar aluno como inscrito no curso correspondente, etc.
        console.log(`[asaas-webhook] Pagamento Academy aprovado: ${ref}`);
        // Logica para liberar curso do aluno (pode inserir no banco de dados de alunos_cursos)
        return NextResponse.json({ received: true, success: true, type: 'academy' });
      }

      // 2. Verificar se é compra da LOJA FÍSICA
      const { data: order } = await supabase
        .from('orders')
        .select('id, status')
        .eq('id', ref)
        .maybeSingle();

      if (!order) {
        console.warn(`[asaas-webhook] Pedido não encontrado para ref: ${ref}`);
        return NextResponse.json({ received: true, error: 'Order not found' });
      }

      if (order.status !== 'PAID' && order.status !== 'DELIVERED') {
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'PAID',
            payment_id: payment.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', ref);

        if (error) {
          console.error(`[asaas-webhook] Erro ao atualizar pedido ${ref}:`, error);
          return NextResponse.json({ received: true, error: 'Database update failed' });
        }
        console.log(`[asaas-webhook] Pedido ${ref} atualizado para PAID.`);
      }

      return NextResponse.json({ received: true, success: true, type: 'loja' });
    }

    return NextResponse.json({ received: true, ignored: true });
  } catch (err: any) {
    console.error(`[asaas-webhook] Erro processando webhook:`, err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
