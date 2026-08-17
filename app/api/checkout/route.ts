import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Configuração do Mercado Pago (Substitua por sua Access Token real no .env.local)
const accessToken = process.env.MP_ACCESS_TOKEN || '';
const isProd = process.env.NODE_ENV === 'production';
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (isProd ? 'https://agnaldogomes.com.br' : 'http://localhost:3000');

const client = accessToken ? new MercadoPagoConfig({ accessToken }) : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, cep, shippingMethod, customerName, customerEmail } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Nenhum item enviado.' }, { status: 400 });
    }

    // Numa versão final, idealmente buscamos o preço no banco (Supabase) para evitar que o cliente manipule o valor.
    const subtotal = items.reduce((acc: number, item: { unit_price: number; quantity: number }) => acc + (item.unit_price * item.quantity), 0);
    
    // Cálculo de frete (simulado, posteriormente ligar na API do Melhor Envio)
    let shippingCost = 0;
    if (shippingMethod === 'MOTOBOY') {
      shippingCost = 15.00; 
    } else if (shippingMethod === 'CORREIOS') {
      shippingCost = 28.50;
    }

    // Cria o registro do pedido no banco de dados
    const orderId = crypto.randomUUID();
    const supabase = await getSupabaseServerClient();
    const { error: dbError } = await supabase.from('orders').insert({
      id: orderId,
      customer_name: customerName || body.customerName || 'Cliente (Checkout)',
      customer_email: customerEmail || body.customerEmail || '',
      total: subtotal + shippingCost,
      status: 'PENDING_PAYMENT',
      items: items,
      cep
    });

    if (dbError) {
      console.error('Erro ao salvar pedido no DB:', dbError);
    }

    const totalAmount = subtotal + shippingCost;

    // Integração real com Mercado Pago: Criação de Preference (Sessão de Pagamento)
    if (client) {
      const preference = new Preference(client);
      try {
        const response = await preference.create({
          body: {
            items: items.map((item: { id: string; title: string; quantity: number; unit_price: number }) => ({
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
              success: `${baseUrl}/loja?status=success`,
              failure: `${baseUrl}/loja?status=failure`,
              pending: `${baseUrl}/loja?status=pending`,
            },
            auto_return: 'approved',
          }
        });

        return NextResponse.json({
          success: true,
          shippingCost,
          total: totalAmount,
          paymentUrl: response.init_point,
        });
        
      } catch (mpError) {
        console.warn('Mercado Pago SDK falhou. Usando modo simulado.', mpError);
      }
    }

    // Fallback simulado para quando não há token válido no .env
    const simulatedPaymentLink = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=SIMULADO-${crypto.randomUUID()}`;
    return NextResponse.json({
      success: true,
      shippingCost,
      total: totalAmount,
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
