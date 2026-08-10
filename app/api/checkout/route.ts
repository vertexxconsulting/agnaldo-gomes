import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configuração do Mercado Pago (Substitua por sua Access Token real no .env.local)
// process.env.MP_ACCESS_TOKEN
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-TEST-MOCK-TOKEN-SUBSTITUIR-DEPOIS' 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, cep, shippingMethod, product } = body;

    if (!productId) {
      return NextResponse.json({ error: 'ID do Produto é obrigatório.' }, { status: 400 });
    }

    // Usaremos o produto que vem no body (Simulando uma leitura do banco)
    // Numa versão final, idealmente buscamos o preço no banco (Supabase) para evitar que o cliente manipule o valor.
    const price = product?.price || 150.00;
    const title = product?.nome || 'Produto Studio Agnaldo';
    
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
          items: [
            {
              id: productId,
              title: title,
              quantity: 1,
              unit_price: price,
              currency_id: 'BRL',
            },
          ],
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

      // O Mercado Pago retorna a URL que devemos redirecionar o usuário
      return NextResponse.json({
        success: true,
        shippingCost,
        total: price + shippingCost,
        paymentUrl: response.init_point, // Link para ambiente real (sandbox_init_point para testes)
      });
      
    } catch (mpError) {
      console.warn('Mercado Pago SDK bloqueou a request pois não há um token válido. Retornando link simulado.', mpError);
      
      // Fallback simulado para enquanto o Agnaldo não coloca o token real no .env
      const simulatedPaymentLink = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=SIMULADO-${crypto.randomUUID()}`;
      return NextResponse.json({
        success: true,
        shippingCost,
        total: price + shippingCost,
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
