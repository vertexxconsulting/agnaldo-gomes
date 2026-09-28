import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStripeConfig } from '@/lib/pagamentos-academy';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { price } = body;

    if (!price || price <= 0) {
      return NextResponse.json({ success: false, error: 'Preço inválido' }, { status: 400 });
    }

    // 1. Setup Stripe
    const cfg = await getStripeConfig();
    
    if (!cfg.ativo || !cfg.secretKey) {
      return NextResponse.json({ success: false, error: 'Stripe não está configurado. Adicione STRIPE_SECRET_KEY e STRIPE_PUBLIC_KEY nas variáveis de ambiente da Vercel.' }, { status: 400 });
    }
    const stripe = new Stripe(cfg.secretKey, { apiVersion: '2026-07-29.dahlia' as any });

    // 2. Buscar Curso VIP
    const { data: curso, error: cursoError } = await supabaseAdmin
      .from('academy_vip_courses')
      .select('title, description, thumbnail_url, price')
      .eq('id', id)
      .single();

    if (cursoError || !curso) {
      console.error('Erro ao buscar curso VIP (supabaseAdmin):', cursoError);
      return NextResponse.json({ success: false, error: 'Curso VIP não encontrado' }, { status: 404 });
    }

    // 3. Criar Product e Price
    const priceInCents = Math.round(price * 100);

    const product = await stripe.products.create({
      name: curso.title + ' (VIP)',
      description: curso.description || 'Curso VIP da Agnaldo Gomes Academy',
      images: curso.thumbnail_url ? [curso.thumbnail_url] : [],
    });

    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: priceInCents,
      currency: 'brl',
    });

    // 4. Criar Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      metadata: {
        curso_id: id,
        sistema: 'academy-ag',
        tipo: 'vip'
      }
    });

    // 5. Atualizar curso VIP no Supabase com o link gerado e o preço
    const { error: updateError } = await supabaseAdmin
      .from('academy_vip_courses')
      .update({
        stripe_payment_link: paymentLink.url,
        price: price
      })
      .eq('id', id);
      
    if (updateError) {
      console.error('Erro ao salvar stripe_payment_link:', updateError);
      // Se der erro aqui, muito provavelmente é pq a coluna stripe_payment_link não existe!
      return NextResponse.json({ 
        success: false, 
        error: 'Link gerado, mas falha ao salvar no banco. Verifique se a coluna "stripe_payment_link" (text) existe na tabela "academy_vip_courses".' 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, paymentLink: paymentLink.url });
  } catch (err: any) {
    console.error('Erro ao gerar Stripe Payment Link:', err);
    return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
  }
}
