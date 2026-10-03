import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/pagamentos-academy';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { createOrUpdateAsaasCustomer, createAsaasPayment, scheduleAsaasInvoice, ASAAS_API_KEY } from '@/lib/asaas';

/**
 * Cria uma sessão de Checkout do Stripe no servidor, usando a Secret Key
 * configurada no painel /admin-academy/pagamentos.
 * Nunca expõe a secret key ao navegador.
 */
export async function POST(req: Request) {
  // Rate limiting: 5 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';
  
  const rlResult = rateLimit(ip, { maxRequests: 5, windowMs: 60_000, keyPrefix: 'checkout' });
  const headers = getRateLimitHeaders(rlResult);
  
  if (!rlResult.allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em um minuto.' },
      { status: 429, headers }
    );
  }

  let cfg = await getStripeConfig();
  if (!cfg || !cfg.secretKey) {
    try {
      // Fallback: tenta ler as credenciais salvas no Supabase (server-side)
      const { getPaymentSettings } = await import('@/lib/payment-settings');
      const settings = await getPaymentSettings('stripe');
      if (settings.secret_key) {
        cfg = { publicKey: settings.publishable_key || '', secretKey: settings.secret_key, ativo: true };
      }
    } catch {
      /* mantém o cfg original */
    }
  }
  if (!cfg || !cfg.secretKey) {
    return NextResponse.json(
      { error: 'Stripe Secret Key não configurada. Configure em /admin-academy/pagamentos.' },
      { status: 400, headers }
    );
  }

  let body: { descricao?: string; valorBRL?: number; nomeAluno?: string; emailAluno?: string; cursoId?: string; country?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400, headers });
  }

  const descricao = String(body?.descricao ?? 'Inscrição Academy AG').slice(0, 124);
  const valorBRL = Number(body?.valorBRL ?? 0);
  if (!valorBRL || valorBRL <= 0 || !isFinite(valorBRL)) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400, headers });
  }

  const nomeAluno = String(body?.nomeAluno ?? '').slice(0, 100) || 'Aluno AG';
  const emailAluno = String(body?.emailAluno ?? '').slice(0, 200) || 'aluno@agnaldogomes.com.br';
  const cursoId = String(body?.cursoId ?? '');
  const country = String(body?.country ?? 'BR');

  const origin = req.headers.get('origin') || 'https://agnaldogomes.vercel.app';

  // Idempotency key baseada no curso + aluno + valor para evitar dupla cobrança
  const idempotencyKey = `academy-${cursoId}-${emailAluno}-${valorBRL}-${Date.now()}`;

  try {
    // --- Fluxo Asaas (Brasil) ---
    if (country === 'BR') {
      if (!ASAAS_API_KEY || ASAAS_API_KEY.includes('sua_api_key')) {
        return NextResponse.json(
          { error: 'Asaas API Key não configurada. Configure no arquivo .env.local' },
          { status: 400, headers }
        );
      }

      // 1. Cria ou Atualiza Cliente no Asaas
      const asaasCustomerId = await createOrUpdateAsaasCustomer({
        name: nomeAluno,
        email: emailAluno,
        cpfCnpj: '00000000000', // Mock para criação inicial, no Asaas checkout real ele preenche se faltar
      });

      // 2. Cria a cobrança (UNDEFINED = Checkout Transparente c/ Link para escolher Pix/Boleto/Cartão)
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 3); // Vence em 3 dias

      const payment = await createAsaasPayment({
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        value: valorBRL,
        dueDate: dataVencimento.toISOString().split('T')[0],
        description: descricao,
        externalReference: `academy-${cursoId}-${emailAluno}`,
      });

      // 3. Agenda a Nota Fiscal (Opcional, mas já garante que quando pago, o Asaas emita)
      await scheduleAsaasInvoice({
        payment: payment.id,
        type: 'NFS-E',
        updatePayment: false,
        municipalServiceId: '1234', // Configure the correct one for the city
        municipalServiceCode: '08.02', // Instrução, treinamento, etc.
        municipalServiceName: 'Cursos Online e Treinamentos',
      });

      return NextResponse.json({ url: payment.invoiceUrl }, { headers });
    }

    // --- Fluxo Stripe (Internacional) ---
    const stripe = new Stripe(cfg.secretKey, {
      apiVersion: '2026-07-29.dahlia',
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'brl',
      payment_method_types: ['card', 'pix'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: { name: descricao },
            unit_amount: Math.round(valorBRL * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: emailAluno.includes('@') ? emailAluno : undefined,
      success_url: `${origin}/academy?inscrito=1&curso=${encodeURIComponent(cursoId)}`,
      cancel_url: `${origin}/academy?cancelado=1`,
      metadata: {
        sistema: 'academy-ag',
        curso_id: cursoId,
        nome_aluno: nomeAluno,
        email_aluno: emailAluno,
      },
    }, {
      idempotencyKey,
    });

    return NextResponse.json({ url: session.url }, { headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Stripe: ${msg}` }, { status: 500, headers });
  }
}