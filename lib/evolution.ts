/**
 * Cliente da Evolution API (WhatsApp) — server-side apenas.
 * Envia texto para um número usando a instância configurada no ambiente.
 *
 * Env vars necessárias:
 *   EVOLUTION_API_URL   ex.: https://evolution-agnaldo.onrender.com
 *   EVOLUTION_API_KEY   apikey da Evolution
 *   EVOLUTION_INSTANCE  nome da instância (padrão: 'agnaldo')
 */

const API_URL = process.env.EVOLUTION_API_URL || '';
const API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE = process.env.EVOLUTION_INSTANCE || 'agnaldo';

export function evolutionConfigurada(): boolean {
  return Boolean(API_URL && API_KEY);
}

export async function verificarStatusWhatsApp(instancia = INSTANCE): Promise<{
  online: boolean;
  conectado: boolean;
  state: 'open' | 'connecting' | 'close' | 'not_found' | 'offline';
}> {
  if (!API_URL || !API_KEY) return { online: false, conectado: false, state: 'offline' };
  try {
    const res = await fetch(`${API_URL.replace(/\/$/, '')}/instance/connectionState/${encodeURIComponent(instancia)}`, {
      headers: { apikey: API_KEY },
      cache: 'no-store',
    });
    if (res.status === 404) return { online: true, conectado: false, state: 'not_found' };
    if (!res.ok) return { online: false, conectado: false, state: 'offline' };
    const data = await res.json();
    const state = (data?.instance?.state as any) || 'close';
    return { online: true, conectado: state === 'open', state };
  } catch {
    return { online: false, conectado: false, state: 'offline' };
  }
}

/**
 * Normaliza o número garantindo DDI do Brasil (55) e apenas dígitos.
 * Ex: "(11) 99999-9999" -> "5511999999999"
 * Ex: "11999999999"     -> "5511999999999"
 * Ex: "5511999999999"   -> "5511999999999"
 */
export function normalizarNumeroWhatsApp(phone: string): string {
  let clean = (phone || '').replace(/\D/g, '');
  if (!clean) return '';

  // Remove zero à esquerda do DDD se houver (ex: 011999999999 -> 11999999999)
  if (clean.startsWith('0')) {
    clean = clean.replace(/^0+/, '');
  }

  // Se tem 10 dígitos (DDD + 8 dígitos) ou 11 dígitos (DDD + 9 dígitos), adiciona DDI 55
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }

  return clean;
}

async function dispararRequisicao(num: string, texto: string) {
  const url = `${API_URL.replace(/\/$/, '')}/message/sendText/${INSTANCE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      apikey: API_KEY,
    },
    body: JSON.stringify({
      number: num,
      text: texto,
      options: { delay: 1200, presence: 'composing', linkPreview: false },
    }),
  });

  const bodyText = await res.text();
  return { ok: res.ok, status: res.status, body: bodyText };
}

/**
 * Envia mensagem de texto. Retorna ok=false com motivo quando indisponível.
 * Possui fallback automático inteligente para o formato com/sem o 9º dígito
 * para garantir compatibilidade com qualquer conta WhatsApp do Brasil.
 */
export async function enviarTexto(numero: string, texto: string): Promise<{ ok: boolean; error?: string }> {
  if (!evolutionConfigurada()) {
    return { ok: false, error: 'Evolution API não configurada' };
  }

  const numNormalizado = normalizarNumeroWhatsApp(numero);
  if (!numNormalizado) {
    return { ok: false, error: 'Número de telefone inválido' };
  }

  try {
    // 1ª tentativa: com o número normalizado (com DDI 55)
    let tentativa = await dispararRequisicao(numNormalizado, texto);

    // Se a primeira tentativa der erro de número inexistente ("exists": false) e for número BR com 9 dígitos
    if (!tentativa.ok && (tentativa.body.includes('"exists":false') || tentativa.status === 400)) {
      // Caso A: Se for celular BR com 9º dígito (55 + DDD + 9 dígitos = 13 caracteres)
      // Tenta enviar sem o 9º dígito (55 + DDD + 8 dígitos = 12 caracteres)
      if (numNormalizado.startsWith('55') && numNormalizado.length === 13) {
        const ddd = numNormalizado.slice(2, 4);
        const semNove = `55${ddd}${numNormalizado.slice(5)}`;
        const tentativaSemNove = await dispararRequisicao(semNove, texto);
        if (tentativaSemNove.ok) {
          return { ok: true };
        }
      }

      // Caso B: Se for celular BR com 8 dígitos (55 + DDD + 8 dígitos = 12 caracteres)
      // Tenta enviar com o 9º dígito (55 + DDD + 9 + 8 dígitos = 13 caracteres)
      if (numNormalizado.startsWith('55') && numNormalizado.length === 12) {
        const ddd = numNormalizado.slice(2, 4);
        const comNove = `55${ddd}9${numNormalizado.slice(4)}`;
        const tentativaComNove = await dispararRequisicao(comNove, texto);
        if (tentativaComNove.ok) {
          return { ok: true };
        }
      }
    }

    if (!tentativa.ok) {
      return { ok: false, error: `Evolution ${tentativa.status}: ${tentativa.body.slice(0, 250)}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
