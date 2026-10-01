import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getMPConfig } from '@/lib/pagamentos-studio';

/**
 * Webhook do Mercado Pago para a LOJA.
 *
 * Fluxo:
 * 1. Recebe POST do MP (topic=payment ou action=payment.*)
 * 2. Busca detalhes do payment via API REST do MP
 * 3. Localiza order no Supabase via external_reference (order.id) ou payment_id
 * 4. Se approved → PAID + baixa estoque (LOCAL_STOCK)
 * 5. Se cancelled/rejected → CANCELLED
 * 6. Idempotência via mp_webhook_logs (UNIQUE payment_id)
 * 7. Responde 200 OK rapidamente
 */
export async function POST(request: NextRequest) {
  // Responder 200 o mais rápido possível — MP espera resposta em < 500ms
  // Processamento real é feito inline mas com tratamento de erros
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    // MP às vezes envia query params ao invés de JSON body
    const url = new URL(request.url);
    payload = {
      type: url.searchParams.get('type') || url.searchParams.get('topic'),
      'data.id': url.searchParams.get('data.id') || url.searchParams.get('id'),
    };
  }

  const topic = payload?.type || payload?.topic || 'unknown';
  const paymentId =
    payload?.data?.id?.toString() ||
    payload?.['data.id']?.toString() ||
    payload?.id?.toString();

  console.log(`[mp-webhook] Recebido: topic=${topic}, payment_id=${paymentId}`);

  // Apenas processar notificações de pagamento
  if (!paymentId || (!topic.includes('payment') && topic !== 'unknown')) {
    console.log(`[mp-webhook] Ignorando notificação não-payment: ${topic}`);
    return NextResponse.json({ received: true, ignored: true });
  }

  const supabase = await getSupabaseServiceClient();

  // ── Idempotência: verificar se já processamos este payment_id ──
  try {
    const { data: existingLog } = await supabase
      .from('mp_webhook_logs')
      .select('id, processed_at')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existingLog?.processed_at) {
      console.log(`[mp-webhook] Payment ${paymentId} já processado, ignorando.`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Registrar antes de processar (lock otimista)
    if (!existingLog) {
      await supabase.from('mp_webhook_logs').insert({
        payment_id: paymentId,
        topic,
        action: payload?.action || null,
        payload,
      });
    }
  } catch (err: any) {
    // Se o INSERT falhar por UNIQUE constraint, outro worker já está processando
    if (err?.code === '23505') {
      console.log(`[mp-webhook] Concorrência detectada para ${paymentId}, ignorando.`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.warn(`[mp-webhook] Erro ao registrar log:`, err?.message);
  }

  // ── Buscar detalhes do pagamento na API do MP ──
  let mpPayment: any;
  try {
    const cfg = await getMPConfig();
    if (!cfg.ativo || !cfg.accessToken) {
      console.error('[mp-webhook] MP não configurado, não é possível consultar payment.');
      return NextResponse.json({ received: true, error: 'MP não configurado' });
    }

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[mp-webhook] Erro ao buscar payment ${paymentId}: ${res.status} ${text.slice(0, 200)}`);
      return NextResponse.json({ received: true, error: 'Falha ao consultar MP' });
    }

    mpPayment = await res.json();
  } catch (err: any) {
    console.error(`[mp-webhook] Exceção ao consultar MP:`, err?.message);
    return NextResponse.json({ received: true, error: 'Exceção MP' });
  }

  const paymentStatus = mpPayment?.status; // approved, pending, rejected, cancelled, etc.
  const externalReference = mpPayment?.external_reference; // nosso order.id

  console.log(`[mp-webhook] Payment ${paymentId}: status=${paymentStatus}, external_reference=${externalReference}`);

  // ── Localizar o pedido no Supabase ──
  let orderId: string | null = null;

  // Tentar por external_reference (preferencial — setado no checkout)
  if (externalReference) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', externalReference)
      .maybeSingle();

    if (order) orderId = order.id;
  }

  // Fallback: buscar por payment_id salvo na orders
  if (!orderId) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (order) orderId = order.id;
  }

  if (!orderId) {
    console.warn(`[mp-webhook] Nenhum pedido encontrado para payment ${paymentId} / ref ${externalReference}`);
    // Atualizar log com erro
    await supabase
      .from('mp_webhook_logs')
      .update({ status: paymentStatus, error_message: 'Pedido não encontrado', processed_at: new Date().toISOString() })
      .eq('payment_id', paymentId);
    return NextResponse.json({ received: true, warning: 'Pedido não encontrado' });
  }

  // ── Processar com base no status do pagamento ──
  try {
    if (paymentStatus === 'approved') {
      // 1. Atualizar status do pedido para PAID
      await supabase
        .from('orders')
        .update({
          status: 'PAID',
          payment_id: paymentId,
        })
        .eq('id', orderId);

      // Nota: o estoque já foi baixado atomicamente via RPC `create_order_with_stock_check` durante o checkout.
      // Aqui nós apenas confirmamos o pagamento.
      console.log(`[mp-webhook] ✅ Pedido ${orderId} marcado como PAID.`);

    } else if (paymentStatus === 'cancelled' || paymentStatus === 'rejected' || paymentStatus === 'refunded') {
      await supabase
        .from('orders')
        .update({
          status: 'CANCELLED',
          payment_id: paymentId,
        })
        .eq('id', orderId);

      console.log(`[mp-webhook] ❌ Pedido ${orderId} marcado como CANCELLED (payment status: ${paymentStatus}).`);

    } else {
      // pending, in_process, etc. — apenas registrar
      console.log(`[mp-webhook] ⏳ Pedido ${orderId}: payment status=${paymentStatus}, aguardando.`);
    }

    // Atualizar log como processado com sucesso
    await supabase
      .from('mp_webhook_logs')
      .update({
        status: paymentStatus,
        order_id: orderId,
        processed_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId);

  } catch (err: any) {
    console.error('[mp-webhook] Erro ao processar pedido', orderId, ':', err?.message);
    await supabase
      .from('mp_webhook_logs')
      .update({
        status: paymentStatus,
        order_id: orderId,
        error_message: err?.message || 'Erro desconhecido',
        processed_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId);
  }

  return NextResponse.json({ received: true });
}
