import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const CHAVE_CONFIG = 'relatorio_ia';

// GET – retorna config salva no banco
export async function GET() {
  try {
    const supabase = await getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', CHAVE_CONFIG)
      .single();

    if (error || !data) {
      return NextResponse.json({
        frequencia: 'diario',
        diaSemana: 0,
        horarioEnvio: '20:00',
        whatsappAgnaldo: '5542991534011',
        ativo: true,
      });
    }

    return NextResponse.json(data.value);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// POST – salva config no banco
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await getSupabaseServiceClient();

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: CHAVE_CONFIG, value: body, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('[api/ia-config] Erro ao salvar:', error);
      return NextResponse.json({ sucesso: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (err: any) {
    return NextResponse.json({ sucesso: false, error: err?.message }, { status: 500 });
  }
}
