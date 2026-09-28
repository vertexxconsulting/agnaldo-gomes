import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { emitirEtiqueta } from '@/lib/envios';

/** Emite a etiqueta oficial (Melhor Envio) para um pedido pago. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = body?.order_id;
    if (!orderId) {
      return NextResponse.json({ error: 'order_id obrigatório.' }, { status: 400 });
    }

    // Confere status do pedido antes de comprar etiqueta
    const supabase = await getSupabaseServiceClient();
    const { data: pedido } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    if (!['PAID', 'SHIPPED', 'DELIVERED'].includes(pedido.status)) {
      return NextResponse.json(
        { error: 'Só é possível emitir etiqueta para pedidos pagos.' },
        { status: 400 }
      );
    }

    const resultado = await emitirEtiqueta(orderId);
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: 400 });
    }
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('[api/envios/etiqueta]', error.message);
    return NextResponse.json({ error: error.message || 'Erro ao emitir etiqueta.' }, { status: 500 });
  }
}
