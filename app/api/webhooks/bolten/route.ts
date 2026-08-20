import { NextRequest, NextResponse } from 'next/server';
import { getBoltenConfig } from '@/lib/bolten';

/**
 * Webhook receiver para eventos do CRM Bolten (Beta).
 * Eventos: opportunity.created, opportunity.transitioned, opportunity.won, opportunity.lost
 * Docs: https://bolten.gitbook.io/bolten-docs/configuracoes-avancadas/webhooks
 *
 * Se BOLTEN_WEBHOOK_KEY estiver configurada, valida o header X-API-KEY.
 * Responde 200 rapidamente (boa prática) e registra o evento em log.
 */
export async function POST(request: NextRequest) {
  const config = getBoltenConfig();

  // Validar chave do webhook quando configurada
  if (config?.webhookKey) {
    const key = request.headers.get('x-api-key');
    if (key !== config.webhookKey) {
      return NextResponse.json({ error: 'X-API-KEY inválida' }, { status: 401 });
    }
  }

  let payload: any = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const eventType = payload?.type ?? 'unknown';
  const opp = payload?.data?.opportunity;

  console.log(
    `[bolten-webhook] event=${eventType} opportunity=${opp?.id ?? 'n/a'} name=${opp?.Name ?? opp?.attributes?.Name ?? 'n/a'} status=${opp?.Status ?? 'n/a'}`
  );

  // Opcional: persistir o evento (ex.: tabela bolten_webhook_events no Supabase)
  // aqui mantemos o endpoint leve; em produção, registrar em DB conforme necessidade.

  return NextResponse.json({ received: true, event: eventType }, { status: 200 });
}
