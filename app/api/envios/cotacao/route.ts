import { NextResponse } from 'next/server';
import { cotarFrete, getShippingConfig } from '@/lib/envios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cep_destino, items, subtotal } = body ?? {};

    if (!cep_destino || String(cep_destino).replace(/\D/g, '').length !== 8) {
      return NextResponse.json({ error: 'CEP de destino inválido.' }, { status: 400 });
    }

    const resultado = await cotarFrete({
      cepDestino: String(cep_destino),
      items: Array.isArray(items) ? items : [],
      subtotal: Number(subtotal) || 0,
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('[api/envios/cotacao]', error.message);
    return NextResponse.json({ error: error.message || 'Erro ao cotar frete.' }, { status: 500 });
  }
}

/** Configuração pública segura (sem token) para o checkout exibir regras */
export async function GET() {
  try {
    const cfg = await getShippingConfig();
    return NextResponse.json({
      frete_gratis: Boolean(cfg.frete_gratis),
      frete_gratis_acima_de: Number(cfg.frete_gratis_acima_de ?? 0),
      valor_motoboy: Number(cfg.valor_motoboy ?? 15),
      prazo_manuseio: Number(cfg.prazo_manuseio ?? 1),
      melhor_envio_configurado: Boolean(cfg.melhor_envio_token),
    });
  } catch {
    return NextResponse.json({ melhor_envio_configurado: false });
  }
}
