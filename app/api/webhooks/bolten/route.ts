import { NextRequest, NextResponse } from 'next/server';
import { getBoltenConfig } from '@/lib/bolten';
import { upsertClienteMae, normalizarTelefone } from '@/lib/crm-sync';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Webhook receiver para eventos do CRM Bolten.
 * SISTEMA MÃE: O Supabase salon_customers é a fonte primária de verdade.
 * Eventos recebidos do CRM externo apenas confirmam e atualizam o cliente cadastrado,
 * sem duplicar registros por telefone ou e-mail.
 *
 * IDEMPOTÊNCIA: Cada evento é registrado na tabela bolten_webhook_events.
 * Eventos já processados são ignorados silenciosamente (200 OK).
 */

/**
 * Gera um hash determinístico simples do payload para usar como event_id de fallback.
 * Não precisa ser criptograficamente seguro, apenas estável para o mesmo payload.
 */
function hashPayload(payload: any): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `bolten-hash-${Math.abs(hash).toString(36)}`;
}

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

  // ── Extrair event_id para idempotência ──
  // Prioridade: header > payload > hash do payload
  const eventId =
    request.headers.get('x-bolten-event-id') ||
    payload?.event_id ||
    payload?.id ||
    hashPayload(payload);

  console.log(`[bolten-webhook] Evento recebido: ${eventType} | event_id: ${eventId}`);

  // ── Verificar idempotência via bolten_webhook_events ──
  const supabase = await getSupabaseServiceClient();
  try {
    // Tentar inserir — se já existe (UNIQUE constraint), ignorar
    const { data: inserted, error: insertError } = await supabase
      .from('bolten_webhook_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        payload,
      })
      .select('event_id')
      .maybeSingle();

    if (insertError) {
      // UNIQUE violation = já processado
      if (insertError.code === '23505') {
        console.log(`[bolten-webhook] Evento ${eventId} já processado (duplicata), ignorando.`);
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }
      // Outro erro — logar mas continuar processando (fail-open)
      console.warn(`[bolten-webhook] Erro ao registrar evento:`, insertError.message);
    }

    if (!inserted) {
      // INSERT retornou null sem erro → provavelmente RLS bloqueou ou duplicata
      console.log(`[bolten-webhook] Evento ${eventId} possivelmente duplicado, ignorando.`);
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
  } catch (err: any) {
    console.warn(`[bolten-webhook] Exceção na verificação de idempotência:`, err?.message);
    // Continuar processando (fail-open) para não perder eventos em caso de erro no banco
  }

  // ── Processar evento ──
  const opp = payload?.data?.opportunity || payload?.data || {};
  const contact = payload?.data?.contact || opp?.Contato || opp?.attributes?.Contato || {};

  const nome = contact?.Nome || contact?.name || opp?.Name || opp?.attributes?.Name || payload?.name;
  const telefone = normalizarTelefone(contact?.Telefone || contact?.phone || opp?.Telefone || payload?.phone);
  const email = contact?.['E-mail'] || contact?.email || opp?.['E-mail'] || payload?.email;

  console.log(`[bolten-webhook] Lead: ${nome || 'n/a'} (${telefone || 'sem telefone'})`);

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

  // ── Marcar como processado ──
  try {
    await supabase
      .from('bolten_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('event_id', eventId);
  } catch (err: any) {
    console.warn(`[bolten-webhook] Erro ao marcar evento como processado:`, err?.message);
  }

  return NextResponse.json({ received: true, event: eventType, event_id: eventId }, { status: 200 });
}

