import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Webhook da Hotmart para processar vendas de cursos.
 * 1. Valida o Hottok (Token da Hotmart).
 * 2. Cria/localiza usuário no Supabase Auth e garante perfil STUDENT em profiles.
 * 3. Identifica o curso em hotmart_product_mapping (por product_id, ucode, offer_code ou fallback ativo).
 * 4. Registra em payment_records e libera matrícula em course_enrollments.
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    const rawBody = await req.text();
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(rawBody);
      body = Object.fromEntries(params.entries());
    } else {
      body = JSON.parse(rawBody);
    }
  } catch (e) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  // O token vem no header 'X-Hotmart-Hottok' ou dentro do body (hottok)
  const hottok = req.headers.get('x-hotmart-hottok') || body.hottok;

  if (!hottok || hottok !== process.env.HOTMART_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Token inválido ou não configurado' }, { status: 403 });
  }

  const transactionId = String(
    body.data?.purchase?.transaction ||
    body.transaction ||
    body.data?.subscription?.subscriber?.code ||
    `hm_${Date.now()}`
  );
  const eventType = String(body.event || body.status || '').toUpperCase().trim();

  const supabase = await getSupabaseServiceClient();

  // Extrair identificadores de produto e oferta enviados pela Hotmart (v1 e v2)
  const candidatosProduto = [
    body.data?.product?.id,
    body.data?.product?.ucode,
    body.data?.offer?.code,
    body.data?.purchase?.offer?.code,
    body.prod,
    body.ucode,
    body.off,
    body.product_id,
    body.offer_code,
  ]
    .filter(v => v !== undefined && v !== null && String(v).trim() !== '' && String(v) !== 'undefined' && String(v) !== 'null')
    .map(v => String(v).trim());

  const productIdLog = candidatosProduto[0] || 'hotmart_test';

  // Eventos de aprovação / liberação do curso (Webhook 2.0 e 1.0)
  const isApprovedEvent =
    eventType === 'PURCHASE_APPROVED' ||
    eventType === 'APPROVED' ||
    eventType === 'PURCHASE_COMPLETE' ||
    eventType === 'PURCHASE_COMPLETED' ||
    eventType === 'COMPLETED';

  // Eventos de cancelamento / reembolso
  const isRevokedEvent =
    eventType === 'PURCHASE_REFUNDED' ||
    eventType === 'PURCHASE_CHARGEBACK' ||
    eventType === 'PURCHASE_CANCELED' ||
    eventType === 'REFUNDED' ||
    eventType === 'CHARGEBACK' ||
    eventType === 'CANCELED';

  if (isApprovedEvent) {
    const email = (body.data?.buyer?.email || body.email || '').toLowerCase().trim();
    const nome = body.data?.buyer?.first_name
      ? `${body.data?.buyer?.first_name} ${body.data?.buyer?.last_name || ''}`.trim()
      : body.data?.buyer?.name || body.name || 'Aluno Hotmart';

    if (!email) {
      return NextResponse.json({ error: 'E-mail do comprador não informado no payload' }, { status: 400 });
    }

    let userId: string | null = null;

    // 1. Tentar encontrar usuário na tabela profiles (case-insensitive)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    userId = existingProfile?.id || null;

    // 2. Se não encontrou em profiles, tentar criar no Supabase Auth (ou localizar caso já exista no Auth)
    if (!userId) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { role: 'STUDENT', full_name: nome },
        password: crypto.randomUUID().slice(-16),
      });

      if (createError) {
        // Caso o usuário já exista no auth.users mas não estava em profiles
        const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const foundAuthUser = usersList?.users?.find(u => (u.email || '').toLowerCase().trim() === email);
        if (foundAuthUser) {
          userId = foundAuthUser.id;
        } else {
          console.error('[hotmart-webhook] Erro ao criar/localizar usuário:', createError);
          return NextResponse.json({ error: 'Falha ao criar usuário: ' + createError.message }, { status: 500 });
        }
      } else {
        userId = newUser.user.id;
      }
    }

    // 3. Garantir registro na tabela profiles com role STUDENT
    if (userId) {
      await supabase.from('profiles').upsert(
        {
          id: userId,
          email,
          full_name: nome,
          role: 'STUDENT',
        },
        { onConflict: 'id' }
      );
    }

    // 4. Descobrir qual curso vincular via hotmart_product_mapping
    let cursoId: string | null = null;

    // Prioridade 1: custom_parameter ou curso_id direto (UUID)
    const customParam = body.data?.purchase?.custom_parameter || body.curso_id;
    if (customParam && typeof customParam === 'string' && customParam.trim().length === 36) {
      cursoId = customParam.trim();
    }

    // Buscar todos os mapeamentos ativos em hotmart_product_mapping
    const { data: activeMappings } = await supabase
      .from('hotmart_product_mapping')
      .select('course_id, hotmart_product_id, hotmart_offer_id')
      .eq('active', true);

    // Prioridade 2: Match exato (case-insensitive) por qualquer identificador de produto ou oferta enviado
    if (!cursoId && activeMappings && activeMappings.length > 0 && candidatosProduto.length > 0) {
      const candidatosLower = candidatosProduto.map(c => c.toLowerCase());
      const matched = activeMappings.find(m => {
        const prodId = (m.hotmart_product_id || '').toLowerCase().trim();
        const offerId = (m.hotmart_offer_id || '').toLowerCase().trim();
        return (
          (prodId && candidatosLower.includes(prodId)) ||
          (offerId && candidatosLower.includes(offerId))
        );
      });

      if (matched?.course_id) {
        cursoId = matched.course_id;
      }
    }

    // Prioridade 3: Fallback para mapeamento ativo (ex.: quando o botão "Enviar Teste" da Hotmart envia ID fictício ou sem ID)
    if (!cursoId && activeMappings && activeMappings.length > 0) {
      cursoId = activeMappings[0].course_id;
      console.log('[hotmart-webhook] Usando mapeamento ativo de hotmart_product_mapping:', cursoId);
    }

    if (!userId || !cursoId) {
      return NextResponse.json(
        {
          success: false,
          user_id: userId,
          message: 'Usuário processado, mas nenhum curso ativo foi encontrado em hotmart_product_mapping.',
        },
        { status: 200 }
      );
    }

    // 5. Registrar ou atualizar em payment_records (sem depender de constraint UNIQUE em provider_payment_id)
    const price = body.data?.purchase?.price?.value ?? body.data?.purchase?.price ?? body.price ?? 0;
    const amountBrl = Number(price);

    const { data: existingPayment } = await supabase
      .from('payment_records')
      .select('id')
      .eq('provider_payment_id', transactionId)
      .maybeSingle();

    const paymentPayload = {
      user_id: userId,
      course_id: cursoId,
      provider: 'hotmart',
      provider_payment_id: transactionId,
      amount_brl: isNaN(amountBrl) ? 0 : amountBrl,
      currency: 'BRL',
      status: 'paid',
      paid_at: new Date().toISOString(),
      metadata: {
        hotmart_event: eventType,
        product_id: body.data?.product?.id ?? body.product_id ?? null,
        product_ucode: body.data?.product?.ucode ?? body.ucode ?? null,
        offer_id: body.data?.offer?.code ?? body.data?.purchase?.offer?.code ?? null,
        buyer_name: nome,
        buyer_email: email,
      },
    };

    if (existingPayment?.id) {
      const { error: updatePayErr } = await supabase
        .from('payment_records')
        .update(paymentPayload)
        .eq('id', existingPayment.id);
      if (updatePayErr) {
        console.error('[hotmart-webhook] Aviso ao atualizar payment_records:', updatePayErr);
      }
    } else {
      const { error: insertPayErr } = await supabase
        .from('payment_records')
        .insert(paymentPayload);
      if (insertPayErr) {
        console.error('[hotmart-webhook] Aviso ao inserir payment_records:', insertPayErr);
      }
    }

    // 6. Liberar matrícula do curso em course_enrollments
    const { data: enrollmentExists } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', cursoId)
      .maybeSingle();

    if (!enrollmentExists) {
      const { error: enrollError } = await supabase.from('course_enrollments').insert({
        user_id: userId,
        course_id: cursoId,
        enrolled_at: new Date().toISOString(),
      });

      if (enrollError) {
        console.error('[hotmart-webhook] Erro ao liberar matrícula em course_enrollments:', enrollError);
        return NextResponse.json({ error: 'Falha ao matricular aluno no curso' }, { status: 500 });
      }
    }

    // 7. Registrar log do evento em hotmart_webhook_events após sucesso
    const { data: processedEvent } = await supabase
      .from('hotmart_webhook_events')
      .select('transaction_id')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (!processedEvent) {
      await supabase.from('hotmart_webhook_events').insert({
        transaction_id: transactionId,
        event_type: eventType,
        hottok_used: hottok ? '***' : null,
        buyer_email: email,
        product_id: productIdLog,
      });
    } else {
      await supabase
        .from('hotmart_webhook_events')
        .update({
          event_type: eventType,
          buyer_email: email,
          product_id: productIdLog,
        })
        .eq('transaction_id', transactionId);
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      course_id: cursoId,
      transaction_id: transactionId,
      message: 'Matrícula liberada com sucesso pelo Hotmart.',
    });
  }

  // Tratamento de reembolso / cancelamento
  if (isRevokedEvent && transactionId) {
    await supabase
      .from('payment_records')
      .update({
        status: eventType.includes('REFUND') ? 'refunded' : 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('provider_payment_id', transactionId);
  }

  return NextResponse.json({ received: true, event: eventType });
}
