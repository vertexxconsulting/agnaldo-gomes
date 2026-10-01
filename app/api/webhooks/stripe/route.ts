import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/pagamentos-academy';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Webhook do Stripe para processar pagamentos confirmados da Academy.
 * 1. Valida a assinatura do Stripe (segurança).
 * 2. Identifica o evento 'checkout.session.completed'.
 * 3. Cria/atualiza payment_records.
 * 4. Trigger automático cria matrícula via RPC create_enrollment_after_payment.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  const cfg = await getStripeConfig();
  if (!cfg.secretKey) {
    return NextResponse.json({ error: 'Stripe não configurado' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET não configurado');
    return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 });
  }

  const stripe = new Stripe(cfg.secretKey, {
    apiVersion: '2026-07-29.dahlia',
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Idempotência: processar cada evento apenas uma vez
  const supabase = await getSupabaseServerClient();
  const eventId = event.id;
  
  const { data: processedEvent } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  
  if (processedEvent) {
    console.log(`[stripe-webhook] Evento ${eventId} já processado, ignorando.`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Registrar evento antes de processar (evita race condition)
  await supabase.from('stripe_webhook_events').insert({ id: eventId, type: event.type, created_at: new Date().toISOString() });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (metadata?.sistema === 'academy-ag') {
        const email = metadata.email_aluno || session.customer_details?.email;
        const nome = metadata.nome_aluno || session.customer_details?.name || 'Aluno';
        const cursoId = metadata.curso_id;
        const paymentId = session.payment_intent as string;

        if (email && cursoId) {
          // 1. Verificar se o usuário já existe no Auth
          const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
          let userId = existingUser?.user?.id;

          if (!userId) {
            // 2. Criar usuário se não existir
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
              email,
              email_confirmed: true,
              user_metadata: { role: 'STUDENT', full_name: nome },
              password: crypto.randomUUID().slice(-12),
            });

            if (createError) {
              console.error('Erro ao criar aluno via webhook:', createError);
            } else {
              userId = newUser.user.id;
            }
          }

          if (userId) {
            // 3. Criar/atualizar payment_records
            const amountBrl = session.amount_total ? session.amount_total / 100 : 0;
            
            const { data: paymentRecord, error: paymentError } = await supabase
              .from('payment_records')
              .upsert({
                user_id: userId,
                course_id: cursoId,
                provider: 'stripe',
                provider_payment_id: paymentId,
                provider_session_id: session.id,
                amount_brl: amountBrl,
                currency: session.currency?.toUpperCase() || 'BRL',
                status: 'paid',
                metadata: {
                  stripe_session_id: session.id,
                  stripe_customer_id: session.customer as string,
                  email_aluno: email,
                  nome_aluno: nome,
                },
                paid_at: new Date().toISOString(),
              }, { onConflict: 'provider_payment_id' })
              .select('id')
              .single();

            if (paymentError) {
              console.error('Erro ao criar payment_records:', paymentError);
            } else {
              // 4. Trigger automático criará a matrícula via create_enrollment_after_payment
              console.log(`[stripe-webhook] Pagamento registrado: ${paymentRecord?.id}, matrícula será criada via trigger`);
            }
          }
        }
      }
    }

    // Eventos de reembolso/cancelamento
    if (event.type === 'charge.refunded' || event.type === 'checkout.session.expired') {
      const obj = event.data.object as any;
      const paymentId = obj.payment_intent || obj.id;
      
      await supabase
        .from('payment_records')
        .update({ 
          status: event.type === 'charge.refunded' ? 'refunded' : 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('provider_payment_id', paymentId);
    }

  } catch (err) {
    console.error('[stripe-webhook] Erro ao processar evento:', err);
    // Não retornar erro para não fazer Stripe retry infinitamente
  }

  return NextResponse.json({ received: true });
}