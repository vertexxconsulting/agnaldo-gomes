import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/pagamentos-academy';

/**
 * Cria uma sessão de Checkout do Stripe no servidor, usando a Secret Key
 * configurada no painel /admin-academy/pagamentos.
 * Nunca expõe a secret key ao navegador.
 */
export async function POST(req: Request) {
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
      { status: 400 }
    );
  }

  let body: { descricao?: string; valorBRL?: number; nomeAluno?: string; emailAluno?: string; cursoId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const descricao = String(body?.descricao ?? 'Inscrição Academy AG').slice(0, 124);
  const valorBRL = Number(body?.valorBRL ?? 0);
  if (!valorBRL || valorBRL <= 0 || !isFinite(valorBRL)) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
  }

  const nomeAluno = String(body?.nomeAluno ?? '').slice(0, 100) || 'Aluno AG';
  const emailAluno = String(body?.emailAluno ?? '').slice(0, 200) || 'aluno@agnaldogomes.com.br';

  const origin = req.headers.get('origin') || 'https://agnaldogomes.vercel.app';

  try {
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
      success_url: `${origin}/academy?inscrito=1&curso=${encodeURIComponent(String(body?.cursoId ?? ''))}`,
      cancel_url: `${origin}/academy?cancelado=1`,
      metadata: {
        sistema: 'academy-ag',
        curso_id: String(body?.cursoId ?? ''),
        nome_aluno: nomeAluno,
        email_aluno: emailAluno,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Stripe: ${msg}` }, { status: 500 });
  }
}
