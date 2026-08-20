/**
 * Pagamentos do Studio — Mercado Pago (PIX real).
 *
 * Fluxo:
 * 1. Credenciais (ACCESS_TOKEN) são salvas pelo admin em /admin/pagamentos
 *    (localStorage + variáveis de ambiente NEXT_PUBLIC_MP_* / MP_TOKEN do servidor).
 * 2. Ao gerar um pagamento PIX, o painel cria a cobrança via API REST do
 *    Mercado Pago e retorna o QR Code base64 + código copia-e-cola reais.
 * 3. Sem credenciais configuradas, mantém o comportamento de demonstração
 *    (código PIX local simulado), garantindo que nada quebra.
 */

export interface ConfiguracaoMP {
  accessToken: string;
  ativo: boolean;
}

const LS_KEY = 'studio-mp-config';
export const ENV_TOKEN =
  (typeof process !== 'undefined' && process.env?.MP_ACCESS_TOKEN) || '';

/** Cache das credenciais vindas do Supabase (30s) */
let mpConfigCache: ConfiguracaoMP | null = null;
let mpConfigUpdatedAt = 0;

export async function getMPConfig(): Promise<ConfiguracaoMP> {
  if (mpConfigCache && Date.now() - mpConfigUpdatedAt < 30_000) return mpConfigCache;

  try {
    const { getPaymentSettings, isPaymentActive } = await import('./payment-settings');
    const settings = await getPaymentSettings('mercado_pago');
    const token = settings.access_token || ENV_TOKEN;
    const ativo = (isPaymentActive(settings) && Boolean(token)) || ENV_TOKEN.length > 0;
    const cfg: ConfiguracaoMP = { accessToken: token, ativo };
    mpConfigCache = cfg;
    mpConfigUpdatedAt = Date.now();
    return cfg;
  } catch {
    /* fallback localStorage */
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const cfg = JSON.parse(raw);
      return {
        accessToken: String(cfg?.accessToken ?? ENV_TOKEN),
        ativo: Boolean(cfg?.ativo) && String(cfg?.accessToken || ENV_TOKEN).length > 0,
      };
    }
  } catch {}
  return { accessToken: ENV_TOKEN, ativo: ENV_TOKEN.length > 0 };
}

export async function saveMPConfig(cfg: ConfiguracaoMP) {
  try {
    const { savePaymentSettings } = await import('./payment-settings');
    await savePaymentSettings('mercado_pago', {
      access_token: cfg.accessToken || null,
      enabled: cfg.ativo,
    });
    // Mantém o localStorage em sincronia para quem ainda o lê
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    mpConfigCache = null; // invalida o cache
  } catch {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    } catch {}
  }
}

export async function isMPAtivo(): Promise<boolean> {
  const cfg = await getMPConfig();
  return cfg.ativo;
}

export interface PixMPResult {
  qrcode_base64: string; // QR Code pronto para exibir
  copia_e_cola: string; // código PIX copia-e-cola
  transaction_id: string;
  real: boolean; // true se veio do Mercado Pago, false se simulado
}

/**
 * Cria uma cobrança PIX no Mercado Pago (API REST oficial).
 * Retorna QR Code base64 e código copia-e-cola reais.
 */
export async function criarPixMercadoPago(
  valor: number,
  descricao: string
): Promise<PixMPResult> {
  const cfg = await getMPConfig();
  if (!cfg.ativo || !cfg.accessToken) {
    throw new Error('Mercado Pago não configurado');
  }

  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `noiva-${Date.now()}`,
    },
    body: JSON.stringify({
      transaction_amount: Number(valor.toFixed(2)),
      description: descricao.slice(0, 124),
      payment_method_id: 'pix',
      payer: { email: 'agendamento@agnaldogomes.com.br' },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Mercado Pago (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const pointOfInteraction = data.point_of_interaction?.transaction_data;
  const qrCode = pointOfInteraction?.qr_code_base64 ?? '';
  const copiaECola = pointOfInteraction?.qr_code ?? '';

  if (!copiaECola) {
    throw new Error('Resposta do Mercado Pago sem QR Code PIX');
  }

  return {
    qrcode_base64: qrCode,
    copia_e_cola: copiaECola,
    transaction_id: String(data.id ?? ''),
    real: true,
  };
}

/** Consulta o status de um pagamento no Mercado Pago */
export async function consultarPagamentoMP(paymentId: string): Promise<{ status: string; }> {
  const cfg = await getMPConfig();
  if (!cfg.ativo) return { status: 'unknown' };
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
  });
  if (!res.ok) return { status: 'unknown' };
  const data = await res.json();
  return { status: String(data.status ?? 'unknown') };
}

export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
