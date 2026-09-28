import { NextResponse } from 'next/server';

export async function GET() {
  const status = {
    mercadoPago: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    boltenCrm: !!process.env.BOLTEN_API_KEY,
  };

  return NextResponse.json(status);
}
