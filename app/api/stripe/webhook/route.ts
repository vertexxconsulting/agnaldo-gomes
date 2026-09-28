import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature') || '';
  const raw = await req.text();
  try {
    const cfg = await import('@/lib/pagamentos-academy').then(m => m.getStripeConfig());
    if (!cfg?.secretKey) throw new Error('Stripe não configurado');
    const stripe = new Stripe(cfg.secretKey, { apiVersion: '2026-07-29.dahlia' });
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    const event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object, req);
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true, event: event.type });
  } catch (err: unknown) {
    console.error('[stripe webhook]', err);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Webhook signature')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, req: Request) {
  const supabase = await import('@/lib/supabase/server').then(m => m.getSupabaseServerClient());
  const corsoId = String(session.metadata?.cursoId || '');
  const emailAluno = String(session.metadata?.emailAluno || '');
  const cupomCode = String(session.metadata?.cupom_code || '').toUpperCase();
  const finalPrice = Number(session.metadata?.final_price || 0);
  const originalPrice = Number(session.metadata?.original_price || finalPrice);
  const discountCents = Number(session.metadata?.discount_cents || 0);

  if (!corsoId || !emailAluno) return;

  let { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, nome')
    .eq('email', emailAluno)
    .single();

  let userId = profile?.id;

  if (!profile || profileErr) {
    console.log('[stripe webhook] perfil não encontrado. Criando conta para:', emailAluno);
    
    try {
      const adminAuth = await import('@/lib/supabase/server').then(m => m.getSupabaseServiceClient());
      
      // Cria a conta e envia o e-mail de convite padrão do Supabase
      const { data: newUser, error: createErr } = await adminAuth.auth.admin.inviteUserByEmail(emailAluno);
      
      if (createErr || !newUser.user) {
        console.error('[stripe webhook] erro ao criar usuário:', createErr);
        return;
      }
      
      userId = newUser.user.id;

      // Opcional: já garante que a linha de profile exista (muitos sistemas tem triggers no Supabase que fazem isso sozinhos, mas por garantia:)
      const nomeBase = String(session.metadata?.nomeAluno || emailAluno.split('@')[0]);
      await adminAuth.from('profiles').upsert({
        id: userId,
        email: emailAluno,
        nome: nomeBase,
        created_at: new Date().toISOString(),
      });
      
      console.log('[stripe webhook] usuário criado com sucesso. ID:', userId);
    } catch (e) {
      console.error('[stripe webhook] erro fatal ao criar conta:', e);
      return;
    }
  }

  if (!userId) return;

  const { data: existingEnroll, error: enrollErr } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', corsoId)
    .single();
  if (!enrollErr && existingEnroll) return;

  const enrollResp = await supabase
    .from('course_enrollments')
    .upsert({
      user_id: userId,
      course_id: corsoId,
      enrolled_at: new Date().toISOString(),
      status: session.payment_status === 'paid' ? 'ACTIVE' : 'PENDING',
      purchased_via: 'STRIPE',
      original_price: originalPrice,
      final_price: finalPrice,
      discount_cents: discountCents,
      cupom: cupomCode || null,
    }, { onConflict: 'user_id,course_id' });

  if (enrollResp.error) {
    console.error('[stripe webhook] upsert enroll:', enrollResp.error);
    return;
  }

  await supabase
    .from('course_purchases')
    .upsert({
      user_id: userId,
      course_id: corsoId,
      purchase_type: 'STRIPE_CHECKOUT',
      purchase_reference: session.id,
      payment_confirmed: session.payment_status === 'paid',
      original_price: originalPrice,
      final_price: finalPrice,
      discount_cents: discountCents,
      cupom_code: cupomCode || null,
      status: session.payment_status === 'paid' ? 'PAID' : 'PENDING',
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,course_id,purchase_type' });

  if (cupomCode) {
    const { data: cupom, error: cupomErr } = await supabase
      .from('coupons')
      .select('id, used_count, max_uses')
      .eq('code', cupomCode)
      .single();
    if (!cupomErr && cupom && (cupom.used_count ?? 0) < (cupom.max_uses ?? 0)) {
      await supabase.rpc('increment_coupon_used', { p_code: cupomCode });
    }
  }

  console.log('[stripe webhook] liberado:', userId, corsoId);
}
