import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    mpConfigured: !!(process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN),
    meConfigured: !!process.env.MELHOR_ENVIO_TOKEN
  });
}
