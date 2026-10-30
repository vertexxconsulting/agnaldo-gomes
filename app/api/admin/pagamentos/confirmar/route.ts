import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, paymentMethod, totalAmount, confirmedBy, agendamentosUnificadosIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do agendamento é obrigatório.' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();

    // 1. Buscar agendamento atual
    const { data: current, error: fetchErr } = await supabase
      .from('salon_appointments')
      .select('id, sub_services, payment_method, total_amount')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !current) {
      return NextResponse.json({ error: fetchErr?.message || 'Agendamento não encontrado' }, { status: 404 });
    }

    const currentSubs = Array.isArray(current.sub_services) ? current.sub_services : [];
    const metaObj = currentSubs.find((s: any) => s && s._meta) || { _meta: true };
    const nowIso = new Date().toISOString();
    const confirmedByStr = confirmedBy || auth.user?.email || 'Gestão do Salão';

    metaObj.financial_status = 'CONFIRMED';
    metaObj.confirmed_at = nowIso;
    metaObj.confirmed_by = confirmedByStr;

    const cleanSubs = currentSubs.filter((s: any) => !s || !s._meta);
    cleanSubs.push(metaObj);

    const patch: Record<string, any> = {
      status: 'COMPLETED',
      financial_status: 'CONFIRMED',
      confirmed_at: nowIso,
      confirmed_by: confirmedByStr,
      sub_services: cleanSubs,
      updated_at: nowIso,
    };

    if (paymentMethod) patch.payment_method = paymentMethod;
    if (totalAmount != null) patch.total_amount = totalAmount;

    const { error: updateErr } = await supabase
      .from('salon_appointments')
      .update(patch)
      .eq('id', id);

    if (updateErr) {
      console.error('[api/admin/pagamentos/confirmar] Erro update:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 2. Se houver agendamentos secundários unificados nesta comanda, confirma-os também com total_amount: 0
    if (Array.isArray(agendamentosUnificadosIds) && agendamentosUnificadosIds.length > 0) {
      for (const secId of agendamentosUnificadosIds) {
        if (secId && secId !== id) {
          try {
            const { data: secCurrent } = await supabase
              .from('salon_appointments')
              .select('id, sub_services')
              .eq('id', secId)
              .maybeSingle();

            const secSubs = Array.isArray(secCurrent?.sub_services) ? secCurrent.sub_services : [];
            const secMeta = secSubs.find((s: any) => s && s._meta) || { _meta: true };
            secMeta.financial_status = 'CONFIRMED';
            secMeta.confirmed_at = nowIso;
            secMeta.confirmed_by = confirmedByStr;

            const cleanSecSubs = secSubs.filter((s: any) => !s || !s._meta);
            cleanSecSubs.push(secMeta);

            await supabase
              .from('salon_appointments')
              .update({
                status: 'COMPLETED',
                financial_status: 'CONFIRMED',
                confirmed_at: nowIso,
                confirmed_by: confirmedByStr,
                total_amount: 0,
                payment_method: paymentMethod || 'UNIFICADO',
                sub_services: cleanSecSubs,
                updated_at: nowIso,
              })
              .eq('id', secId);
          } catch (secErr) {
            console.warn('[api/admin/pagamentos/confirmar] Aviso ao sincronizar unificado secundário:', secId, secErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      id,
      financial_status: 'CONFIRMED',
      confirmed_at: nowIso,
      confirmed_by: confirmedByStr,
    });
  } catch (err: any) {
    console.error('[api/admin/pagamentos/confirmar]', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao confirmar fechamento' }, { status: 500 });
  }
}
