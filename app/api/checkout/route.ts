import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ENVIO_DEFAULT } from '@/lib/envios';

// Configuração do Mercado Pago
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '';
const isProd = process.env.NODE_ENV === 'production';
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (isProd ? 'https://agnaldogomes.com.br' : 'http://localhost:3000');

const client = accessToken ? new MercadoPagoConfig({ accessToken }) : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, cep, shippingMethod, customerName, customerEmail, customerPhone, customerCpf, shippingAddress } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Nenhum item enviado.' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // ── Transação: validar estoque + criar pedido + decrementar (apenas LOCAL_STOCK) ──
    const orderId = crypto.randomUUID();
    let shippingCost = 0;
    if (shippingMethod === 'MOTOBOY') shippingCost = ENVIO_DEFAULT.valorMotoboy || 15.00;
    else if (shippingMethod === 'CORREIOS') shippingCost = ENVIO_DEFAULT.valorCorreios || 28.50;
    else if (shippingMethod === 'JADLOG') shippingCost = ENVIO_DEFAULT.valorCorreios || 28.50; // Using Correios as fallback for Jadlog for now

    const subtotal = items.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0);
    const total = subtotal + shippingCost;

    // Usar RPC para transação atômica
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_order_with_stock_check', {
      p_order_id: orderId,
      p_customer_name: customerName || 'Cliente (Checkout)',
      p_customer_email: customerEmail || '',
      p_customer_phone: customerPhone || null,
      p_customer_cpf: customerCpf || null,
      p_shipping_cep: cep,
      p_shipping_address: shippingAddress?.address || '',
      p_shipping_number: shippingAddress?.number || '',
      p_shipping_complement: shippingAddress?.complement || null,
      p_shipping_neighborhood: shippingAddress?.neighborhood || '',
      p_shipping_city: shippingAddress?.city || '',
      p_shipping_state: shippingAddress?.state || '',
      p_shipping_method: shippingMethod,
      p_shipping_cost: shippingCost,
      p_subtotal: subtotal,
      p_total: total,
      p_items: items.map((item: any) => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
      })),
    });

    if (rpcError) {
      console.error('[checkout] Erro RPC:', rpcError);
      // Verificar se é erro de estoque
      if (rpcError.message?.includes('Estoque insuficiente')) {
        return NextResponse.json({ 
          error: rpcError.message,
          code: 'INSUFFICIENT_STOCK'
        }, { status: 409 });
      }
      return NextResponse.json({ error: 'Erro ao processar pedido' }, { status: 500 });
    }

    if (rpcResult?.error) {
      return NextResponse.json({ error: rpcResult.error, code: rpcResult.code }, { status: rpcResult.code === 'INSUFFICIENT_STOCK' ? 409 : 400 });
    }

    // Se chegou aqui, pedido criado e estoque baixado
    // Criar preference no Mercado Pago
    if (client) {
      const preference = new Preference(client);
      try {
        const response = await preference.create({
          body: {
            external_reference: orderId,
            notification_url: `${baseUrl}/api/webhooks/mercadopago`,
            items: items.map((item: any) => ({
              id: item.id,
              title: item.title,
              quantity: item.quantity,
              unit_price: item.unit_price,
              currency_id: 'BRL',
            })),
            shipments: {
              cost: shippingCost,
              mode: 'not_specified',
            },
            back_urls: {
              success: `${baseUrl}/loja?status=success&order_id=${orderId}`,
              failure: `${baseUrl}/loja?status=failure&order_id=${orderId}`,
              pending: `${baseUrl}/loja?status=pending&order_id=${orderId}`,
            },
            auto_return: 'approved',
          }
        });

        return NextResponse.json({
          success: true,
          orderId,
          shippingCost,
          total,
          paymentUrl: response.init_point,
        });
      } catch (mpError) {
        console.warn('Mercado Pago SDK falhou. Usando modo simulado.', mpError);
      }
    }

    // Fallback simulado
    if (isProd) {
      return NextResponse.json(
        { error: 'Sistema de pagamentos não está disponível no momento.' },
        { status: 503 }
      );
    }

    const simulatedPaymentLink = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=SIMULADO-${crypto.randomUUID()}`;
    return NextResponse.json({
      success: true,
      orderId,
      shippingCost,
      total,
      paymentUrl: simulatedPaymentLink,
      simulated: true,
    });

  } catch (error) {
    console.error('Checkout Error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar checkout.' },
      { status: 500 }
    );
  }
}