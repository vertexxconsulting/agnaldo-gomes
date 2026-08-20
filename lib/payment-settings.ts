/**
 * Configurações de pagamento persistidas no Supabase (tabela public.payment_settings)
 * - provider 'mercado_pago' -> Studio / Dia da Noiva (campo access_token)
 * - provider 'stripe' -> Academy (campos publishable_key / secret_key)
 *
 * Se o Supabase não estiver conectado (sem env vars) ou a tabela não existir,
 * o sistema usa o fallback em localStorage — o comportamento de demonstração
 * continua funcionando enquanto as chaves reais não são inseridas.
 */

export type PaymentProvider = 'mercado_pago' | 'stripe';

export interface PaymentSettings {
  id: string;
  provider: PaymentProvider;
  environment: 'production' | 'test';
  /** Mercado Pago: Access Token de produção */
  access_token: string | null;
  /** Stripe: Publishable Key */
  publishable_key: string | null;
  /** Stripe: Secret Key (nunca é enviada ao navegador em requests inseguros) */
  secret_key: string | null;
  enabled: boolean;
  updated_at: string | null;
}

const LS_PREFIX = 'payment_settings:';

/** Fallback em memória/localStorage quando o Supabase não está configurado */
function lsGet(provider: PaymentProvider): PaymentSettings | null {
  try {
    const raw = localStorage?.getItem?.(LS_PREFIX + provider);
    return raw ? (JSON.parse(raw) as PaymentSettings) : null;
  } catch {
    return null;
  }
}

function lsSet(provider: PaymentProvider, settings: PaymentSettings) {
  try {
    localStorage?.setItem?.(LS_PREFIX + provider, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

/**
 * Busca as configurações de pagamento de um provedor.
 * Ordem: Supabase conectado → Supabase; caso contrário localStorage.
 */
export async function getPaymentSettings(provider: PaymentProvider): Promise<PaymentSettings> {
  const empty: PaymentSettings = {
    id: '',
    provider,
    environment: 'production',
    access_token: null,
    publishable_key: null,
    secret_key: null,
    enabled: false,
    updated_at: null,
  };

  if (typeof window === 'undefined') {
    // Server-side: server client inline (sem importar ./supabase/server, que
    // depende de next/headers e quebraria o bundle client durante o SSR).
    try {
      const { createServerClient } = await import('@supabase/ssr');
      const { cookies } = await import('next/headers');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (!url || !key) return empty;
      const cookieStore = await cookies();
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
            catch { /* ignore */ }
          },
        },
      });
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('provider', provider)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          provider: data.provider,
          environment: data.environment,
          access_token: data.access_token,
          publishable_key: data.publishable_key,
          secret_key: data.secret_key,
          enabled: Boolean(data.enabled),
          updated_at: data.updated_at,
        };
      }
    } catch {
      /* fallback */
    }
    return empty;
  }

  try {
    const { supabase } = await import('./supabase/client');
    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('provider', provider)
      .single();
    if (!error && data) {
      const s: PaymentSettings = {
        id: data.id,
        provider: data.provider,
        environment: data.environment,
        access_token: data.access_token,
        publishable_key: data.publishable_key,
        secret_key: data.secret_key,
        enabled: Boolean(data.enabled),
        updated_at: data.updated_at,
      };
      lsSet(provider, s);
      return s;
    }
  } catch {
    /* fallback */
  }
  return lsGet(provider) ?? empty;
}

export interface SavePaymentSettingsInput {
  access_token?: string | null;
  publishable_key?: string | null;
  secret_key?: string | null;
  enabled?: boolean;
}

/**
 * Salva as configurações de pagamento no Supabase (com fallback localStorage).
 * Ao salvar, limpa os campos não aplicáveis ao provedor (ex.: MP não grava secret_key).
 */
export async function savePaymentSettings(
  provider: PaymentProvider,
  input: SavePaymentSettingsInput,
): Promise<{ ok: boolean; msg: string }> {
  const payload: Record<string, unknown> = {};
  if (input.access_token !== undefined) payload.access_token = input.access_token;
  if (input.publishable_key !== undefined) payload.publishable_key = input.publishable_key;
  if (input.secret_key !== undefined) payload.secret_key = input.secret_key;
  if (input.enabled !== undefined) payload.enabled = input.enabled;

  // Limpar campos do outro provedor para manter a tabela limpa
  if (provider === 'mercado_pago') {
    payload.publishable_key = null;
    payload.secret_key = null;
  } else {
    payload.access_token = null;
  }

  let ok = false;
  try {
    const { supabase } = await import('./supabase/client');
    const { data, error } = await supabase
      .from('payment_settings')
      .upsert({ provider, ...payload }, { onConflict: 'provider' })
      .select('*')
      .single();
    if (!error && data) {
      const s: PaymentSettings = {
        id: data.id,
        provider: data.provider,
        environment: data.environment,
        access_token: data.access_token,
        publishable_key: data.publishable_key,
        secret_key: data.secret_key,
        enabled: Boolean(data.enabled),
        updated_at: data.updated_at,
      };
      lsSet(provider, s);
      ok = true;
    }
  } catch {
    /* fallback */
  }

  if (!ok) {
    // Fallback localStorage: montar settings a partir do fallback existente
    const current = lsGet(provider) ?? ({
      id: `${provider}-${Date.now()}`,
      provider,
      environment: 'production',
      access_token: null,
      publishable_key: null,
      secret_key: null,
      enabled: false,
      updated_at: null,
    } as PaymentSettings);
    lsSet(provider, { ...current, ...payload, updated_at: new Date().toISOString() });
    ok = true;
  }

  return {
    ok,
    msg: ok
      ? input.enabled
        ? 'Credenciais salvas e pagamentos ativados.'
        : 'Credenciais salvas. Ative o switch para começar a receber pagamentos.'
      : 'Não foi possível salvar as credenciais.',
  };
}

/**
 * Verifica se o provedor está ativo (credenciais preenchidas + enabled).
 * Mercado Pago: access_token preenchido. Stripe: pk + sk preenchidas.
 */
export function isPaymentActive(settings: PaymentSettings): boolean {
  if (!settings.enabled) return false;
  if (settings.provider === 'mercado_pago') return Boolean(settings.access_token);
  return Boolean(settings.publishable_key && settings.secret_key);
}
