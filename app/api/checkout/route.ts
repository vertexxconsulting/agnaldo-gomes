import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { supabase } from '@/lib/supabase';

// Configuração do Mercado Pago (Substitua por sua Access Token real no .env.local)
// process.env.MP_ACCESS_TOKEN
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-TEST-MOCK-TOKEN-SUBSTITUIR-DEPOIS' 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, cep, shippingMethod } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Nenhum item enviado.' }, { status: 400 });
    }

    // Numa versão final, idealmente buscamos o preço no banco (Supabase) para evitar que o cliente manipule o valor.
    // O array items deve ser processado buscando os dados no DB
    const subtotal = items.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0);
    
    // Cálculo de frete (simulado, posteriormente ligar na API do Melhor Envio)
    let shippingCost = 0;
    if (shippingMethod === 'MOTOBOY') {
      shippingCost = 15.00; 
    } else if (shippingMethod === 'CORREIOS') {
      shippingCost = 28.50; 
    }

    // Integração real com Mercado Pago: Criação de Preference (Sessão de Pagamento)
    const preference = new Preference(client);

    try {
      const response = await preference.create({
        body: {
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
            success: 'http://localhost:3000/loja?status=success',
            failure: 'http://localhost:3000/loja?status=failure',
            pending: 'http://localhost:3000/loja?status=pending',
          },
          auto_return: 'approved',
        }
      });

      // Cria o registro do pedido no banco de dados
      const { error: dbError } = await supabase.from('orders').insert({
        id: Math.floor(Math.random() * 1000000).toString(),
        customer_name: body.customerName || 'Cliente (Checkout)',
        customer_email: body.customerEmail || '',
        total: subtotal + shippingCost,
        status: 'PENDING_PAYMENT',
        items: items
      });

      if (dbError) {
        console.error('Erro ao salvar pedido no DB:', dbError);
      }

      // O Mercado Pago retorna a URL que devemos redirecionar o usuário
      return NextResponse.json({
        success: true,
        shippingCost,
        total: subtotal + shippingCost,
        paymentUrl: response.init_point, // Link para ambiente real (sandbox_init_point para testes)
      });
      
    } catch (mpError) {
      console.warn('Mercado Pago SDK bloqueou a request pois não há um token válido. Retornando link simulado.', mpError);
      
      // Salva no banco também o pedido simulado
      await supabase.from('orders').insert({
        id: Math.floor(Math.random() * 1000000).toString(),
        customer_name: body.customerName || 'Cliente Simulado',
        total: subtotal + shippingCost,
        status: 'PENDING_PAYMENT',
        items: items
      });

      // Fallback simulado para enquanto o Agnaldo não coloca o token real no .env
      const simulatedPaymentLink = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=SIMULADO-${crypto.randomUUID()}`;
      return NextResponse.json({
        success: true,
        shippingCost,
        total: subtotal + shippingCost,
        paymentUrl: simulatedPaymentLink,
        simulated: true, // Avisa o frontend que foi simulado
      });
    }

  } catch (error) {
    console.error('Checkout Error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar checkout.' },
      { status: 500 }
    );
  }
}
