/**
 * Pagamentos da Academy — Stripe.
 *
 * Fluxo:
 * 1. Credenciais são configuradas via variáveis de ambiente (Vercel / .env.local):
 *    - STRIPE_SECRET_KEY (sk_live_ ou sk_test_)
 *    - STRIPE_PUBLIC_KEY (pk_live_ ou pk_test_)
 * 2. Com as chaves configuradas, o aluno é direcionado a um Stripe Checkout
 *    Payment Link real (criado via API com a SECRET_KEY), que faz a cobrança
 *    com qualquer cartão/Pix internacional do Stripe.
 * 3. Sem credenciais, o checkout não é ativado e o sistema exibe um aviso.
 */

export interface ConfiguracaoStripe {
  publicKey: string;
  secretKey: string;
  ativo: boolean;
}

export async function getStripeConfig(): Promise<ConfiguracaoStripe> {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const publicKey = process.env.STRIPE_PUBLIC_KEY || '';
  const ativo = secretKey.length > 0 && publicKey.length > 0;

  return { publicKey, secretKey, ativo };
}

/** @deprecated Chaves agora são gerenciadas via variáveis de ambiente (Vercel). */
export async function saveStripeConfig(_cfg: ConfiguracaoStripe) {
  console.warn('saveStripeConfig está desativado. Configure as chaves via variáveis de ambiente no Vercel.');
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
