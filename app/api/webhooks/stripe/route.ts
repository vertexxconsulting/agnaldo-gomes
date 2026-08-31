import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/pagamentos-academy';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Webhook do Stripe para processar pagamentos confirmados.
 * 1. Valida a assinatura do Stripe (segurança).
 * 2. Identifica o evento 'checkout.session.completed'.
 * 3. Cria o usuário no Auth do Supabase (se não existir).
 * 4. Cria a matrícula do aluno no curso correspondente.
 * 5. (Futuro) Trata eventos de subscription para recorrência.
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
    console.log(`[webhook] Evento ${eventId} já processado, ignorando.`);
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

        if (email && cursoId) {
          // 1. Verificar se o usuário já existe no Auth
          const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
          let userId = existingUser?.user?.id;

          if (!userId) {
            // 2. Criar usuário se não existir
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
              email,
              email_confirmed: true,
              user_metadata: { role: 'aluno', full_name: nome },
              password: Math.random().toString(36).slice(-12),
            });

            if (createError) {
              console.error('Erro ao criar aluno via webhook:', createError);
            } else {
              userId = newUser.user.id;
            }
          }

          if (userId) {
            // 3. Criar a matrícula
            const { error: enrollError } = await supabase
              .from('course_enrollments')
              .upsert({
                user_id: userId,
                course_id: cursoId,
                enrolled_at: new Date().toISOString()
              }, { onConflict: 'user_id,course_id' });

            if (enrollError) {
              console.error('Erro ao matricular aluno via webhook:', enrollError);
            } else {
              console.log(`[webhook] Aluno ${email} matriculado no curso ${cursoId}`);
            }
          }
        }
      }
    }

    // FUTURO: Eventos de subscription para recorrência
    // if (event.type === 'invoice.payment_succeeded') { ... }
    // if (event.type === 'customer.subscription.deleted') { ... }
    // if (event.type === 'customer.subscription.updated') { ... }

  } catch (err) {
    console.error('[webhook] Erro ao processar evento:', err);
    // Não retornar erro para não fazer Stripe retry infinitamente
  }

  return NextResponse.json({ received: true });
}