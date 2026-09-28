import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getStripeConfig } from '@/lib/pagamentos-academy';

interface CupomLineItem {
  course_id: string;
  unit_amount: number; // centavos
  description_short: string;
  images: string[];
}

/** Valida se um cupom é aceitável para o checkout do curso e retorna desconto a aplicar */
function validarCupom(
  cupom: string,
  cursoId: string,
  amountInCents: number
): { ok: boolean; reason?: string; discountInCents?: number; finalInCents?: number } {
  if (!cupom || cupom.trim().length === 0) {
    return { ok: false, reason: 'Código de cupom inválido.' };
  }
  const code = cupom.trim().toUpperCase();

  // Valores de exemplo — aqui você pode buscar ao Supabase como no body abaixo
  // Esse validador é apenas para o caso de o cupom ser passado via parâmetro simples;
  // O checkout abaixo busca realmente no banco.
  return { ok: false, reason: 'Validação através de banco de cupons inválida.' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cursoId } = body;

    if (!cursoId) {
      return NextResponse.json({ error: 'ID do curso não fornecido' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // 1. Buscar curso
    const { data: curso, error: cursoError } = await supabase
      .from('courses')
      .select('title, price, thumbnail_url, stripe_payment_link, slug')
      .eq('id', cursoId)
      .single();

    if (cursoError || !curso) {
      return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 });
    }

    // 2. Se já tem Stripe Payment Link (produto criado diretamente no Stripe), redireciona ele
    if (curso.stripe_payment_link) {
      return NextResponse.json({ url: curso.stripe_payment_link });
    }

    // 3. Determinar preço base
    let unitPrice = curso.price ? Number(curso.price) : 97.00;
    unitPrice = Math.max(0, parseFloat(unitPrice.toFixed(2)));

    // 4. Validar cupom (se passado via body ou query param)
    const cupomParam = body.coupon ?? req.nextUrl.searchParams.get('coupon') ?? '';
    const cupom = cupomParam.trim();

    let discountInCents = 0;
    let discountDescription = '';

    if (cupom.length > 0) {
      const { data: cupomData, error: cupomError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cupom.toUpperCase())
        .eq('active', true)
        .maybeSingle();

      if (cupomError) {
        console.error('[checkout/stripe] Erro ao buscar cupom:', cupomError);
      } else if (cupomData) {
        // Validações
        const now = new Date().toISOString();
        if (new Date(cupomData.valid_from) > new Date(now)) {
          discountDescription = `Cupom válido a partir de ${cupomData.valid_from.toLocaleDateString('pt-BR')}`;
        } else if (new Date(cupomData.valid_until) < new Date(now)) {
          discountDescription = 'Cupom expirado.';
        } else if (cupomData.max_uses !== null && cupomData.used_count >= cupomData.max_uses) {
          discountDescription = 'Cupom atingiu o limite de uso.';
        } else if (cupomData.course_id && cupomData.course_id !== cursoId) {
          discountDescription = 'Este cupom só vale para o curso indicado.';
        } else {
          // Cupom válido — calcular desconto
          const discountType = cupomData.discount_type; // 'percent' ou 'fixed'
          const discountValue = Number(cupomData.discount_value);

          if (discountType === 'percent') {
            discountInCents = Math.round(unitPrice * (discountValue / 100.0) * 100);
          } else {
            discountInCents = Math.round(discountValue * 100);
          }
          // Garantir que o desconto não seja maior que o preço
          discountInCents = Math.min(discountInCents, Math.round(unitPrice * 100));
          discountDescription = cupomData.description
            ? `Cupom "${cupomData.code}": ${cupomData.description}`
            : `Cupom "${cupomData.code}" aplicado.`;
        }
      }
    }

    const unitAmountInCents = Math.round(unitPrice * 100);
    const finalAmountInCents = Math.max(0, unitAmountInCents - discountInCents);
    const finalPriceFormatted = (finalAmountInCents / 100).toFixed(2);

    // 5. Se já tem Stripe Payment Link (produto criado diretamente no Stripe), redireciona ele
    if (curso.stripe_payment_link) {
      return NextResponse.json({ url: curso.stripe_payment_link });
    }

    // 6. Configurar Stripe
    const cfg = await getStripeConfig();
    if (!cfg.ativo || !cfg.secretKey) {
      return NextResponse.json({ error: 'Stripe não está configurado na plataforma.' }, { status: 500 });
    }

    const stripe = new Stripe(cfg.secretKey, { apiVersion: '2026-07-29.dahlia' });

    const isProd = process.env.NODE_ENV === 'production';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (isProd ? 'https://agnaldogomes.com.br' : 'http://localhost:3000');

    // 7. Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email ?? undefined,
      payment_method_types: ['card', 'pix'], // PIX aparece automaticamente em BRL
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: curso.title,
              description: curso.description ?? undefined,
              images: curso.thumbnail_url ? [curso.thumbnail_url] : [],
            },
            unit_amount: finalAmountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/aluno/cursos/${cursoId}?success=true&CouponApplied=${encodeURIComponent(cupom)}&FinalPrice=${encodeURIComponent(finalPriceFormatted)}`,
      cancel_url: `${baseUrl}/academy/checkout/${cursoId}?canceled=true${cupom ? `&coupon=${encodeURIComponent(cupom)}` : ''}`,
      metadata: {
        sistema: 'academy-ag',
        curso_id: cursoId,
        email_aluno: user.email,
        nome_aluno: user.user_metadata?.full_name || 'Aluno',
        cupom_used: cupom || '',
        discount_cents: String(discountInCents),
        original_price: unitPrice.toString(),
        final_price: finalPriceFormatted,
      },
      // Opcional: adicionar cupom como parâmetro de rastreabilidade
      // (Stripe não suporta cupom customizado direto no Checkout, mas podemos rastrea-lo no metadata)
    });

    return NextResponse.json({
      url: session.url,
      finalPrice: finalPriceFormatted,
      discountApplied: discountInCents > 0 ? discountDescription : '',
    });
  } catch (error: any) {
    console.error('Erro no checkout Stripe:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar checkout' }, { status: 500 });
  }
}
