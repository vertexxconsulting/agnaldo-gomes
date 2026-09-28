import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    mpConfigured: !!process.env.MP_ACCESS_TOKEN,
    meConfigured: !!process.env.MELHOR_ENVIO_TOKEN
  });
}
