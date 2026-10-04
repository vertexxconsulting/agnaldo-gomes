import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    asaasConfigured: !!process.env.ASAAS_API_KEY,
    meConfigured: !!process.env.MELHOR_ENVIO_TOKEN
  });
}
