import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profissionalId, servicoIds } = body;

    if (!profissionalId) {
      return NextResponse.json({ error: 'ID do profissional é obrigatório' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();

    // 1. Remover vínculos existentes
    const { error: deleteError } = await supabase
      .from('salon_professional_services')
      .delete()
      .eq('professional_id', profissionalId);

    if (deleteError) {
      console.error('[api/profissionais/vinculos] Erro ao deletar vínculos:', deleteError);
    }

    // 2. Inserir novos vínculos
    const validServicoIds = Array.isArray(servicoIds) ? servicoIds.filter(Boolean) : [];
    if (validServicoIds.length > 0) {
      const inserts = validServicoIds.map((service_id: string) => ({
        professional_id: profissionalId,
        service_id,
      }));

      const { error: insertError } = await supabase
        .from('salon_professional_services')
        .insert(inserts);

      if (insertError) {
        console.error('[api/profissionais/vinculos] Erro ao inserir vínculos:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, count: validServicoIds.length });
  } catch (err: any) {
    console.error('[api/profissionais/vinculos] Erro inesperado:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
