import { NextResponse } from 'next/server';
import { verificarStatusWhatsApp } from '@/lib/evolution';

export async function GET() {
  const wa = await verificarStatusWhatsApp();

  const status = {
    mercadoPago: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    boltenCrm: !!process.env.BOLTEN_API_KEY,
    evolutionApi: wa.online,
    whatsappConnected: wa.conectado,
    whatsappState: wa.state, // 'open' | 'connecting' | 'close' | 'not_found' | 'offline'
  };

  return NextResponse.json(status);
}
