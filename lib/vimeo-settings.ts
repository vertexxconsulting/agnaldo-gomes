import { createClient } from '@supabase/supabase-js';

// Client administrativo para configurações do Vimeo (Executado APENAS no servidor)
export async function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface VimeoSettings {
  id: string;
  access_token: string | null;
  client_id: string | null;
  client_secret: string | null;
  enabled: boolean;
  updated_at: string | null;
}

export async function getVimeoSettings(): Promise<VimeoSettings | null> {
  const clientId = process.env.VIMEO_CLIENT_ID;
  const clientSecret = process.env.VIMEO_CLIENT_SECRET;
  const accessToken = process.env.VIMEO_ACCESS_TOKEN;

  return {
    id: 'vimeo-config',
    access_token: accessToken || null,
    client_id: clientId || null,
    client_secret: clientSecret || null,
    enabled: Boolean(clientId && clientSecret && accessToken),
    updated_at: new Date().toISOString(),
  };
}

export async function saveVimeoSettings(input: Partial<VimeoSettings>): Promise<{ ok: boolean; msg: string }> {
  return { ok: false, msg: 'As configurações do Vimeo agora são gerenciadas exclusivamente pelas Variáveis de Ambiente na Vercel.' };
}
