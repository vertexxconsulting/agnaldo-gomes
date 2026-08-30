import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

type ConfigBody = Partial<{
  melhor_envio_token: string;
  melhor_envio_sandbox: boolean;
  cep_origem: string;
  remetente_nome: string;
  remetente_endereco: string;
  remetente_numero: string;
  remetente_bairro: string;
  remetente_cidade: string;
  remetente_estado: string;
  remetente_email: string;
  remetente_cpf_cnpj: string;
  frete_gratis: boolean;
  frete_gratis_acima_de: number | string;
  valor_motoboy: number | string;
  prazo_manuseio: number | string;
}>;

/** GET — devolve a config com o token MASCARADO (nunca exposto ao navegador). */
export async function GET() {
  const supabase = await getSupabaseServiceClient();
  const { data } = await supabase
    .from('shipping_config')
    .select('*')
    .eq('id', true)
    .single();

  if (!data) return NextResponse.json({ error: 'Config não encontrada. Rode supabase_migration_envios.sql.' }, { status: 404 });

  const token: string = data.melhor_envio_token ?? '';
  return NextResponse.json({
    ...data,
    melhor_envio_token: undefined, // nunca devolver
    token_presente: token.length > 0,
    token_mascarado: token ? `••••••••${token.slice(-4)}` : '',
  });
}

/** POST — salva a config; campo de token vazio/ausente preserva o atual. */
export async function POST(req: Request) {
  try {
    const body: ConfigBody = await req.json();
    const supabase = await getSupabaseServiceClient();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const camposTexto = [
      'cep_origem', 'remetente_nome', 'remetente_endereco', 'remetente_numero',
      'remetente_bairro', 'remetente_cidade', 'remetente_estado', 'remetente_email', 'remetente_cpf_cnpj',
    ] as const;
    for (const c of camposTexto) {
      if (body[c] !== undefined) patch[c] = String(body[c]);
    }
    for (const c of ['melhor_envio_sandbox', 'frete_gratis'] as const) {
      if (body[c] !== undefined) patch[c] = Boolean(body[c]);
    }
    for (const c of ['frete_gratis_acima_de', 'valor_motoboy', 'prazo_manuseio'] as const) {
      if (body[c] !== undefined && body[c] !== '') patch[c] = Number(body[c]) || 0;
    }

    // Token: só sobrescreve quando veio algo novo; string "clear" remove.
    if (typeof body.melhor_envio_token === 'string') {
      const t = body.melhor_envio_token.trim();
      if (t === 'CLEAR') patch.melhor_envio_token = '';
      else if (t.length > 0 && !t.startsWith('••')) patch.melhor_envio_token = t;
    }

    const { error } = await supabase.from('shipping_config').update(patch).eq('id', true);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[api/envios/config]', error.message);
    return NextResponse.json({ error: error.message || 'Erro ao salvar configuração.' }, { status: 500 });
  }
}
