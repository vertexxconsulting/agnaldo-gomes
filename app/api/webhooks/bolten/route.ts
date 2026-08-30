import { NextRequest, NextResponse } from 'next/server';
import { getBoltenConfig } from '@/lib/bolten';
import { upsertClienteMae, normalizarTelefone } from '@/lib/crm-sync';

/**
 * Webhook receiver para eventos do CRM Bolten.
 * SISTEMA MÃE: O Supabase salon_customers é a fonte primária de verdade.
 * Eventos recebidos do CRM externo apenas confirmam e atualizam o cliente cadastrado,
 * sem duplicar registros por telefone ou e-mail.
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

  const eventType = payload?.type ?? payload?.event ?? 'unknown';
  const opp = payload?.data?.opportunity || payload?.data || {};
  const contact = payload?.data?.contact || opp?.Contato || opp?.attributes?.Contato || {};

  const nome = contact?.Nome || contact?.name || opp?.Name || opp?.attributes?.Name || payload?.name;
  const telefone = normalizarTelefone(contact?.Telefone || contact?.phone || opp?.Telefone || payload?.phone);
  const email = contact?.['E-mail'] || contact?.email || opp?.['E-mail'] || payload?.email;

  console.log(`[bolten-webhook] Evento recebido: ${eventType} | Lead: ${nome || 'n/a'} (${telefone || 'sem telefone'})`);

  // Se tiver pelo menos nome e telefone, confirma/atualiza no CRM mãe
  if (nome && telefone) {
    try {
      await upsertClienteMae({
        nome: String(nome).split('—')[0].trim(),
        telefone,
        email: email || null,
        observacoes: `Origem: Bolten CRM (${eventType})`,
      });
      console.log(`[bolten-webhook] Cliente sincronizado com o sistema mãe com sucesso: ${nome}`);
    } catch (err: any) {
      console.warn('[bolten-webhook] Erro ao sincronizar cliente vindo do CRM externo:', err?.message || err);
    }
  }

  return NextResponse.json({ received: true, event: eventType }, { status: 200 });
}
