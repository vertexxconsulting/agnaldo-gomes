import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Webhook da Hotmart para processar vendas de cursos.
 * 1. Valida o Hottok (Token da Hotmart).
 * 2. Cria usuário no Supabase Auth se não existir.
 * 3. Registra em payment_records -> que via trigger cria course_enrollments.
 */
export async function POST(req: NextRequest) {
  // A Hotmart envia webhooks em formato JSON ou URL Encoded (depende da configuração).
  // A versão mais nova (Webhook 2.0) envia JSON.
  let body: any;
  try {
    const rawBody = await req.text();
    body = JSON.parse(rawBody);
  } catch (e) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  // O token vem no header 'X-Hotmart-Hottok' ou dentro do body (hottok)
  const hottok = req.headers.get('x-hotmart-hottok') || body.hottok;
  
  if (!hottok || hottok !== process.env.HOTMART_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Token inválido ou não configurado' }, { status: 403 });
  }

  // Idempotência
  const transactionId = body.data?.purchase?.transaction || body.transaction;
  const eventType = body.event || body.status;
  
  if (!transactionId) {
    return NextResponse.json({ error: 'Faltando transaction_id' }, { status: 400 });
  }

  const supabase = await getSupabaseServiceClient();
  
  const { data: processedEvent } = await supabase
    .from('hotmart_webhook_events')
    .select('transaction_id')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (processedEvent) {
    console.log(`[hotmart-webhook] Evento ${transactionId} já processado.`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Grava para evitar processamento duplicado
  await supabase.from('hotmart_webhook_events').insert({
    transaction_id: transactionId,
    event_type: eventType,
    hottok_used: hottok ? '***' : null,
    buyer_email: body.data?.buyer?.email || body.email,
    product_id: String(body.data?.product?.id || body.product_id)
  });

  // Hotmart Webhook 2.0 -> evento = 'PURCHASE_APPROVED'
  // Hotmart Webhook 1.0 -> status = 'APPROVED'
  if (eventType === 'PURCHASE_APPROVED' || eventType === 'APPROVED' || eventType === 'PURCHASE_COMPLETE') {
    const email = (body.data?.buyer?.email || body.email || '').toLowerCase().trim();
    const nome = body.data?.buyer?.first_name
      ? `${body.data?.buyer?.first_name} ${body.data?.buyer?.last_name || ''}`.trim()
      : body.data?.buyer?.name || body.name || 'Aluno Hotmart';
    
    if (email) {
      let userId = null;
      
      // 1. Tentar encontrar usuário
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      userId = existingProfile?.id;
 
      // 2. Se não existe, cria com senha aleatória
      if (!userId) {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { role: 'STUDENT', full_name: nome },
          password: crypto.randomUUID().slice(-16),
        });
 
        if (createError) {
          console.error('[hotmart-webhook] Erro ao criar usuário:', createError);
          return NextResponse.json({ error: 'Falha ao criar usuário' }, { status: 500 });
        }
        userId = newUser.user.id;
      }
      
      // GARANTIA: Atualiza a role na tabela profiles para STUDENT (sobrepondo o DEFAULT do banco)
      if (userId) {
        await supabase.from('profiles').update({ role: 'STUDENT', full_name: nome }).eq('id', userId);
      }

      // 3) Descobrir qual curso vincular
      let cursoId: string | null = null;

      // Prioridade 1: custom_parameter (compatibilidade)
      const customParam = body.data?.purchase?.custom_parameter || body.curso_id;
      if (customParam && typeof customParam === 'string' && customParam.length === 36) {
        cursoId = customParam;
      }

      // Prioridade 2: Mapeamento Hotmart -> Curso pelo product_id
      if (!cursoId) {
        const hotmartProductId = String(body.data?.product?.id || body.product_id || '');
        if (hotmartProductId && hotmartProductId !== 'undefined' && hotmartProductId !== 'null' && hotmartProductId.trim() !== '') {
          const { data: mapping } = await supabase
            .from('hotmart_product_mapping')
            .select('course_id')
            .eq('hotmart_product_id', hotmartProductId)
            .eq('active', true)
            .maybeSingle();

          if (mapping?.course_id) {
            cursoId = mapping.course_id;
          }
        }
      }

      // Prioridade 3: Fallback - Se só houver 1 mapeamento ativo, usa ele automaticamente
      if (!cursoId) {
        const { data: maps } = await supabase
          .from('hotmart_product_mapping')
          .select('course_id')
          .eq('active', true)
          .limit(2);

        if (maps && maps.length === 1) {
          cursoId = maps[0].course_id;
          console.log('[hotmart-webhook] Usando fallback com único mapeamento ativo');
        }
      }
 
      // 4. Registrar o pagamento (Isso trigga a liberação do curso no banco)
      if (userId && cursoId) {
        const price = body.data?.purchase?.price?.value || body.data?.purchase?.price || 0;
        const amountBrl = Number(price);
        
        const { data: payment, error: paymentError } = await supabase
          .from('payment_records')
          .upsert({
            user_id: userId,
            course_id: cursoId,
            provider: 'hotmart',
            provider_payment_id: String(transactionId),
            amount_brl: isNaN(amountBrl) ? 0 : amountBrl,
            currency: 'BRL',
            status: 'paid',
            paid_at: new Date().toISOString(),
            metadata: {
              hotmart_event: eventType,
              product_id: body.data?.product?.id,
              offer_id: body.data?.offer?.code,
              buyer_name: nome,
            },
          }, { onConflict: 'provider_payment_id' })
          .select()
          .single();

        if (paymentError) {
          console.error('[hotmart-webhook] Erro ao criar payment_records:', paymentError);
          return NextResponse.json({ error: 'Falha ao registrar pagamento' }, { status: 500 });
        }

        // Garante matrícula caso o trigger não rode por algum motivo
        const { data: enrollmentExists } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', cursoId)
          .maybeSingle();

        if (!enrollmentExists) {
          await supabase.from('course_enrollments').insert({
            user_id: userId,
            course_id: cursoId,
            enrolled_at: new Date().toISOString(),
          });
        }
 
        return NextResponse.json({ success: true, user_id: userId, course_id: cursoId, message: 'Matrícula liberada com sucesso pelo Hotmart.' });
      } else {
         return NextResponse.json({ success: true, message: 'Usuário processado, mas nenhum curso vinculado ao produto Hotmart. Cadastre o mapeamento em hotmart_product_mapping.' });
      }
    }
  }

  return NextResponse.json({ received: true });
}
