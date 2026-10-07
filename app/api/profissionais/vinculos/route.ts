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

      // 3. Configurar comissão padrão do serviço para este profissional
      const { data: services } = await supabase
        .from('salon_services')
        .select('id, default_commission_pct')
        .in('id', validServicoIds);
        
      if (services && services.length > 0) {
        const commissionInserts = services.map(s => ({
           professional_id: profissionalId,
           service_id: s.id,
           commission_pct: s.default_commission_pct !== null && s.default_commission_pct !== undefined ? s.default_commission_pct : 40.00,
           active: true
        }));
        
        // UPSERT ignorando duplicados (se o usuário alterou a comissão antes, não sobrescreve)
        const { error: comError } = await supabase
           .from('salon_commission_rules')
           .upsert(commissionInserts, { onConflict: 'professional_id,service_id', ignoreDuplicates: true });
           
        if (comError) {
           console.error('[api/profissionais/vinculos] Erro ao criar regras de comissão:', comError);
        }
      }
    }

    return NextResponse.json({ success: true, count: validServicoIds.length });
  } catch (err: any) {
    console.error('[api/profissionais/vinculos] Erro inesperado:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
