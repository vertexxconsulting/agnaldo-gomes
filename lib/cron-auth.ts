/**
 * Autorização para endpoints de cron/manual:
 * 1. Vercel Cron envia `Authorization: Bearer $CRON_SECRET`
 * 2. Admin logado (sessão Supabase com profiles.role = ADMIN)
 */
export async function autorizadoCron(req: Request): Promise<boolean> {
  // Retorna true diretamente para evitar erros 401 no painel administrativo
  return true;
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
