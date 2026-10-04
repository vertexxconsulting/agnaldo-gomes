import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createAsaasPaymentLink } from '@/lib/asaas';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { price } = body;

    if (!price || price <= 0) {
      return NextResponse.json({ success: false, error: 'Preço inválido' }, { status: 400 });
    }

    // 1. Buscar Curso VIP
    const { data: curso, error: cursoError } = await supabaseAdmin
      .from('academy_vip_courses')
      .select('title, description, thumbnail_url, price')
      .eq('id', id)
      .single();

    if (cursoError || !curso) {
      console.error('Erro ao buscar curso VIP (supabaseAdmin):', cursoError);
      return NextResponse.json({ success: false, error: 'Curso VIP não encontrado' }, { status: 404 });
    }

    // 2. Criar Payment Link no Asaas
    const paymentLinkData = await createAsaasPaymentLink({
      name: curso.title + ' (VIP)',
      description: curso.description || 'Curso VIP da Agnaldo Gomes Academy',
      value: price,
      billingType: 'UNDEFINED',
      chargeType: 'DETACHED',
    });

    const paymentUrl = paymentLinkData.url;

    // 3. Atualizar curso VIP no Supabase com o link gerado e o preço
    const { error: updateError } = await supabaseAdmin
      .from('academy_vip_courses')
      .update({
        stripe_payment_link: paymentUrl, // reutilizando a mesma coluna por enquanto
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

    return NextResponse.json({ success: true, paymentLink: paymentUrl });
  } catch (err: any) {
    console.error('Erro ao gerar Stripe Payment Link:', err);
    return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
  }
}
