/**
 * Autorização para endpoints de cron/manual:
 * 1. Vercel Cron envia `Authorization: Bearer $CRON_SECRET`
 * 2. Admin logado (sessão Supabase com profiles.role = ADMIN)
 */
export async function autorizadoCron(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET || '';
  const auth = req.headers.get('authorization') ?? '';
  if (secret && auth === `Bearer ${secret}`) return true;

  try {
    const { getSupabaseServerClient } = await import('./supabase/server');
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) return false;
    const { createClient } = await import('@supabase/supabase-js');
    const svc = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data } = await svc.from('profiles').select('role').eq('id', user.id).single();
    return data?.role === 'ADMIN';
  } catch {
    return false;
  }
}

/** Data de hoje em BRT (UTC-3) como ISO YYYY-MM-DD */
export function hojeBRT(): string {
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return agora.toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
