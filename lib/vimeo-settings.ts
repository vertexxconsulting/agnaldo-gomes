/**
* Configurações do Vimeo persistidas no Supabase (tabela public.vimeo_settings)
*/

export interface VimeoSettings {
  id: string;
  access_token: string | null;
  client_id: string | null;
  client_secret: string | null;
  enabled: boolean;
  updated_at: string | null;
}

const LS_KEY = 'vimeo_settings';

function lsGet(): VimeoSettings | null {
  try {
    const raw = localStorage?.getItem?.(LS_KEY);
    return raw ? (JSON.parse(raw) as VimeoSettings) : null;
  } catch {
    return null;
  }
}

function lsSet(settings: VimeoSettings) {
  try {
    localStorage?.setItem?.(LS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export async function getVimeoSettings(): Promise<VimeoSettings> {
  const empty: VimeoSettings = {
    id: '',
    access_token: null,
    client_id: null,
    client_secret: null,
    enabled: false,
    updated_at: null,
  };

  if (typeof window === 'undefined') {
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
        .from('vimeo_settings')
        .select('*')
        .single();
      if (!error && data) {
        return {
          id: data.id,
          access_token: data.access_token,
          client_id: data.client_id,
          client_secret: data.client_secret,
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
      .from('vimeo_settings')
      .select('*')
      .single();
    if (!error && data) {
      const s: VimeoSettings = {
        id: data.id,
        access_token: data.access_token,
        client_id: data.client_id,
        client_secret: data.client_secret,
        enabled: Boolean(data.enabled),
        updated_at: data.updated_at,
      };
      lsSet(s);
      return s;
    }
  } catch {
    /* fallback */
  }
  return lsGet() ?? empty;
}

export async function saveVimeoSettings(input: Partial<VimeoSettings>): Promise<{ ok: boolean; msg: string }> {
  let ok = false;
  try {
    const { supabase } = await import('./supabase/client');
    const { data, error } = await supabase
      .from('vimeo_settings')
      .upsert({ id: 'vimeo-config', ...input }, { onConflict: 'id' })
      .select('*')
      .single();
    if (!error && data) {
      const s: VimeoSettings = {
        id: data.id,
        access_token: data.access_token,
        client_id: data.client_id,
        client_secret: data.client_secret,
        enabled: Boolean(data.enabled),
        updated_at: data.updated_at,
      };
      lsSet(s);
      ok = true;
    }
  } catch {
    /* fallback */
  }

  if (!ok) {
    const current = lsGet() ?? ({
      id: 'vimeo-config',
      access_token: null,
      client_id: null,
      client_secret: null,
      enabled: false,
      updated_at: null,
    } as VimeoSettings);
    lsSet({ ...current, ...input, updated_at: new Date().toISOString() });
    ok = true;
  }

  return {
    ok,
    msg: ok ? 'Configurações do Vimeo salvas.' : 'Erro ao salvar configurações do Vimeo.',
  };
}
