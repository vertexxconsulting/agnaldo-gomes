/**
 * Pagamentos da Academy — Stripe.
 *
 * Fluxo:
 * 1. Credenciais (PUBLIC_KEY + SECRET_KEY ou PUBLISHABLE_KEY do servidor)
 *    são salvas pelo admin em /admin-academy/pagamentos.
 * 2. Com as chaves configuradas, o aluno é direcionado a um Stripe Checkout
 *    Payment Link real (criado via API com a SECRET_KEY), que faz a cobrança
 *    com qualquer cartão/Pix internacional do Stripe.
 * 3. Sem credenciais, mantém o fluxo de demonstração (inscrição registrada
 *    localmente), garantindo que nada quebra.
 *
 * Por segurança, a SECRET_KEY nunca é exposta ao navegador: quando ela está
 * disponível apenas como NEXT_PUBLIC_STRIPE_SECRET (modo demonstração/dev),
 * o checkout é feito via API do próprio site (/api/academy/checkout), que
 * usa a SECRET_KEY no servidor e devolve a URL do Checkout do Stripe.
 */

export interface ConfiguracaoStripe {
  publicKey: string;
  secretKey: string;
  ativo: boolean;
}

const LS_KEY = 'academy-stripe-config';

/** Cache das credenciais vindas do Supabase (30s) */
let stripeConfigCache: ConfiguracaoStripe | null = null;
let stripeConfigUpdatedAt = 0;

export async function getStripeConfig(): Promise<ConfiguracaoStripe> {
  if (stripeConfigCache && Date.now() - stripeConfigUpdatedAt < 30_000) return stripeConfigCache;

  try {
    const { getPaymentSettings, isPaymentActive } = await import('./payment-settings');
    const settings = await getPaymentSettings('stripe');
    const cfg: ConfiguracaoStripe = {
      publicKey: settings.publishable_key || '',
      secretKey: settings.secret_key || '',
      ativo: isPaymentActive(settings),
    };
    stripeConfigCache = cfg;
    stripeConfigUpdatedAt = Date.now();
    return cfg;
  } catch {
    /* fallback localStorage */
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const cfg = JSON.parse(raw);
      return {
        publicKey: String(cfg?.publicKey ?? ''),
        secretKey: String(cfg?.secretKey ?? ''),
        ativo: Boolean(cfg?.ativo) && (String(cfg?.publicKey) || '').length > 0,
      };
    }
  } catch {}
  return { publicKey: '', secretKey: '', ativo: false };
}

export async function saveStripeConfig(cfg: ConfiguracaoStripe) {
  try {
    const { savePaymentSettings } = await import('./payment-settings');
    await savePaymentSettings('stripe', {
      publishable_key: cfg.publicKey || null,
      secret_key: cfg.secretKey || null,
      enabled: cfg.ativo,
    });
    // Mantém o localStorage em sincronia para quem ainda o lê
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    stripeConfigCache = null; // invalida o cache
  } catch {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    } catch {}
  }
}

export async function isStripeAtivo(): Promise<boolean> {
  const cfg = await getStripeConfig();
  return cfg.ativo;
}

/**
 * Valida o formato das chaves Stripe (sk_live_/pk_live_ ou sk_test_/pk_test_)
 */
export function validarChavesStripe(publicKey: string, secretKey: string): { ok: boolean; msg: string } {
  const pkOk = /^pk_(test|live)_[A-Za-z0-9]{20,}$/.test(publicKey.trim());
  const skOk = secretKey.trim() === '' || /^sk_(test|live)_[A-Za-z0-9]{20,}$/.test(secretKey.trim());
  if (!pkOk) return { ok: false, msg: 'A Publishable Key deve começar com pk_test_ ou pk_live_.' };
  if (!skOk) return { ok: false, msg: 'A Secret Key (opcional no painel) deve começar com sk_test_ ou sk_live_.' };
  return { ok: true, msg: '' };
}

/**
 * Cria uma sessão de checkout do Stripe via API do próprio site.
 * Devolve a URL do Stripe Checkout para redirecionar o aluno.
 */
export async function criarCheckoutStripe(
  params: { descricao: string; valorBRL: number; nomeAluno: string; emailAluno: string; cursoId?: string }
): Promise<{ url: string; real: boolean }> {
  const cfg = await getStripeConfig();
  if (!cfg.ativo) {
    throw new Error('Stripe não configurado');
  }

  const res = await fetch('/api/academy/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      descricao: params.descricao.slice(0, 124),
      valorBRL: Number(params.valorBRL.toFixed(2)),
      nomeAluno: params.nomeAluno.slice(0, 100),
      emailAluno: params.emailAluno.slice(0, 200),
      cursoId: params.cursoId,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Stripe (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.url) throw new Error('Resposta sem URL de checkout');
  return { url: String(data.url), real: true };
}

export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
