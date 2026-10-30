/**
 * GET  /api/admin/marketing/rule-config?ruleId=<uuid>
 * POST /api/admin/marketing/rule-config
 *      body: { ruleId: string; ativo: boolean; horario: string }
 *
 * Persiste em salon_system_settings com chave `mkt_rule_cfg_<ruleId>`.
 */
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

function settingKey(ruleId: string) {
  return `mkt_rule_cfg_${ruleId}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ruleId = url.searchParams.get('ruleId');
  if (!ruleId) {
    return NextResponse.json({ error: 'ruleId obrigatório' }, { status: 400 });
  }

  try {
    const supabase = await getSupabaseServiceClient();
    const { data } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', settingKey(ruleId))
      .maybeSingle();

    const config = data?.value
      ? JSON.parse(data.value)
      : { ativo: false, horario: '10:00' };

    return NextResponse.json({ ok: true, config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ruleId, ativo, horario } = body as {
      ruleId: string;
      ativo: boolean;
      horario: string;
    };

    if (!ruleId) {
      return NextResponse.json({ error: 'ruleId obrigatório' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();
    const { error } = await supabase
      .from('salon_system_settings')
      .upsert(
        {
          key: settingKey(ruleId),
          value: JSON.stringify({ ativo: Boolean(ativo), horario: horario || '10:00' }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
