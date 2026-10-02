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
  if (eventType === 'PURCHASE_APPROVED' || eventType === 'APPROVED') {
    const email = body.data?.buyer?.email || body.email;
    const nome = body.data?.buyer?.name || body.name || 'Aluno Hotmart';
    
    // NOTA: O product_id aqui é o ID do produto da Hotmart (ex: 123456)
    // Se o webhook não estiver enviando o UUID do curso_id do Supabase,
    // será necessário um DE/PARA (Mapeamento) no banco de dados.
    // Para simplificar, se você configurou o curso_id como uma 'oferta' ou 'custom_parameter' na Hotmart:
    const cursoId = body.data?.purchase?.custom_parameter || body.curso_id; 

    if (email) {
      let userId = null;
      
      // 1. Tentar encontrar usuário
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
      userId = existingUser?.user?.id;

      // 2. Se não existe, cria com senha aleatória
      if (!userId) {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          email_confirmed: true,
          user_metadata: { role: 'STUDENT', full_name: nome },
          password: crypto.randomUUID().slice(-12),
        });

        if (createError) {
          console.error('[hotmart-webhook] Erro ao criar usuário:', createError);
          return NextResponse.json({ error: 'Falha ao criar usuário' }, { status: 500 });
        }
        userId = newUser.user.id;
      }

      // 3. Registrar o pagamento (Isso trigga a liberação do curso no banco)
      if (userId && cursoId) {
        const price = body.data?.purchase?.price?.value || 0;
        
        await supabase
          .from('payment_records')
          .upsert({
            user_id: userId,
            course_id: cursoId,
            provider: 'hotmart',
            provider_payment_id: transactionId,
            amount: price,
            currency: 'BRL',
            status: 'completed',
          }, { onConflict: 'provider_payment_id' });

        return NextResponse.json({ success: true, user_id: userId, message: 'Matrícula criada com sucesso.' });
      } else {
         return NextResponse.json({ success: true, message: 'Usuário processado, mas sem ID de curso válido para matricular.' });
      }
    }
  }

  return NextResponse.json({ received: true });
}
