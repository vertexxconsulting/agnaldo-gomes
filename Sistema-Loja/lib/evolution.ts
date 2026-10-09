/**
 * Cliente da Evolution API (WhatsApp) — server-side apenas.
 * Envia texto para um número usando a instância configurada no ambiente.
 *
 * Env vars necessárias:
 *   EVOLUTION_API_URL   ex.: https://evolution.suaempresa.com.br
 *   EVOLUTION_API_KEY   apikey da Evolution
 *   EVOLUTION_INSTANCE  nome da instância (padrão: 'agnaldo')
 */

const API_URL = process.env.EVOLUTION_API_URL || '';
const API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE = process.env.EVOLUTION_INSTANCE || 'agnaldo';

export function evolutionConfigurada(): boolean {
  return Boolean(API_URL && API_KEY);
}

/**
 * Envia mensagem de texto. Retorna ok=false com motivo quando indisponível —
 * o chamador deve cair no fallback wa.me (clique manual).
 */
export async function enviarTexto(numero: string, texto: string): Promise<{ ok: boolean; error?: string }> {
  if (!evolutionConfigurada()) {
    return { ok: false, error: 'Evolution API não configurada' };
  }
  try {
    const res = await fetch(`${API_URL.replace(/\/$/, '')}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: API_KEY,
      },
      body: JSON.stringify({
        number: numero,
        text: texto,
        options: { delay: 1200, presence: 'composing', linkPreview: false },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Evolution ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
