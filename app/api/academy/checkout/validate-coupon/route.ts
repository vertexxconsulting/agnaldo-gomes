import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code, courseId } = await req.json().catch(() => ({})) as { code?: string; courseId?: string };
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Cupom não informado.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { valid: false, error: 'Serviço de cupom indisponível (Supabase não configurado).' },
        { status: 503 }
      );
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, anonKey);

    const codeUpper = code.trim().toUpperCase();
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', codeUpper)
      .eq('active', true)
      .single();

    if (error || !coupon) {
      return NextResponse.json({ valid: false, error: 'Cupom não encontrado ou inválido.' }, { status: 400 });
    }

    const agora = new Date();
    if (agora < new Date(coupon.valid_from) || agora > new Date(coupon.valid_until)) {
      return NextResponse.json({ valid: false, error: 'Cupom fora da validade.' }, { status: 400 });
    }

    if (coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: 'Cupom atingiu o limite de usos.' }, { status: 400 });
    }

    if (coupon.course_id && coupon.course_id !== courseId) {
      return NextResponse.json({ valid: false, error: 'Este cupom não se aplica a este curso.' }, { status: 400 });
    }

    let finalPrice = 0;
    const coursePrice = 0; // obtido pelo front-end a partir do course.price

    if (coupon.discount_type === 'percent') {
      finalPrice = coursePrice * (1 - Number(coupon.discount_value) / 100);
    } else {
      finalPrice = Math.max(0, coursePrice - Number(coupon.discount_value));
    }

    const discountLabel = coupon.discount_type === 'percent'
      ? `Desconto de ${coupon.discount_value}%`
      : `Desconto de R$ ${Number(coupon.discount_value).toFixed(2)}`;

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      finalPrice,
      discountLabel,
      originalPrice: coursePrice,
    });
  } catch (err) {
    console.error('[api/checkout/validate-coupon]', err);
    return NextResponse.json(
      { valid: false, error: 'Erro interno ao validar cupom.' },
      { status: 500 }
    );
  }
}
