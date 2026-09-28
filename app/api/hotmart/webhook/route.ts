import { NextResponse } from 'next/server';

// Rota para receber os Postbacks / Webhooks da Hotmart
// Ao ser ativada na Hotmart (quando uma compra é aprovada), esta rota cria o usuário e dá o acesso.

export async function POST(req: Request) {
  try {
    // A Hotmart envia um hottok no cabeçalho ou body para verificar a autenticidade
    // O token fica configurado no painel da Hotmart nas configurações do Webhook (Postback)
    const hotmartToken = process.env.HOTMART_WEBHOOK_TOKEN || '';
    const body = await req.json();

    // Verificação de segurança (Se o token não bater, ignora a requisição)
    if (hotmartToken && body.hottok !== hotmartToken) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // A Hotmart envia diversos status, o que nos importa para liberar curso é o "APPROVED" ou "COMPLETED"
    if (body.event === 'PURCHASE_APPROVED' || body.status === 'approved') {
      await handleHotmartPurchase(body);
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true, event: body.event || body.status });
  } catch (err: unknown) {
    console.error('[hotmart webhook]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleHotmartPurchase(payload: any) {
  // Inicializamos os clients do Supabase
  const supabase = await import('@/lib/supabase/server').then(m => m.getSupabaseServerClient());
  const adminAuth = await import('@/lib/supabase/server').then(m => m.getSupabaseServiceClient());

  // Os dados da Hotmart variam dependendo da versão do Webhook, adaptamos para os mais comuns:
  const emailAluno = payload.buyer?.email || payload.email || '';
  const nomeAluno = payload.buyer?.name || payload.name || emailAluno.split('@')[0];
  const cursoId = payload.product?.id || payload.prod; // No mundo real, mapear ID Hotmart para o ID do curso no Supabase
  const precoFinal = Number(payload.purchase?.price?.value || payload.price || 0);

  if (!emailAluno || !cursoId) {
    console.error('[hotmart webhook] Dados insuficientes:', payload);
    return;
  }

  console.log(`[hotmart webhook] Processando compra para ${emailAluno} no curso ${cursoId}`);

  // 1. Procurar ou Criar o Usuário
  let { data: profile } = await supabase
    .from('profiles')
    .select('id, email, nome')
    .eq('email', emailAluno)
    .single();

  let userId = profile?.id;

  if (!userId) {
    console.log('[hotmart webhook] Perfil não encontrado. Criando conta e enviando email de convite nativo do Supabase.');
    
    // Dispara o e-mail nativo do Supabase com o link para definir a senha e acessar a plataforma
    const { data: newUser, error: createErr } = await adminAuth.auth.admin.inviteUserByEmail(emailAluno);
    
    if (createErr || !newUser.user) {
      console.error('[hotmart webhook] Erro ao criar usuário:', createErr);
      return;
    }
    
    userId = newUser.user.id;

    // Garante a existência do profile
    await adminAuth.from('profiles').upsert({
      id: userId,
      email: emailAluno,
      nome: nomeAluno,
      created_at: new Date().toISOString(),
    });
  }

  // 2. Criar ou Atualizar a Matrícula
  const enrollResp = await adminAuth
    .from('course_enrollments')
    .upsert({
      user_id: userId,
      course_id: String(cursoId),
      enrolled_at: new Date().toISOString(),
      status: 'ACTIVE',
      purchased_via: 'HOTMART',
      final_price: precoFinal,
    }, { onConflict: 'user_id,course_id' });

  if (enrollResp.error) {
    console.error('[hotmart webhook] Erro ao registrar matrícula:', enrollResp.error);
    return;
  }

  // 3. Registrar a Transação Financeira (Purchase)
  await adminAuth
    .from('course_purchases')
    .upsert({
      user_id: userId,
      course_id: String(cursoId),
      purchase_type: 'HOTMART',
      purchase_reference: payload.purchase?.transaction || payload.transaction || 'hotmart_req',
      payment_confirmed: true,
      final_price: precoFinal,
      status: 'PAID',
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,course_id,purchase_type' });

  console.log(`[hotmart webhook] Liberação concluída para o usuário ${emailAluno}!`);
}
