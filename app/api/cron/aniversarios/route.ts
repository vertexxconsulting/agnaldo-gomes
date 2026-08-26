/**
 * CRON diário (08h BRT): aniversariantes do dia.
 * Envia via Evolution API quando configurada; sempre retorna links wa.me
 * como fallback de disparo manual.
 */
import { NextResponse } from 'next/server';
import { autorizadoCron, hojeBRT } from '@/lib/cron-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { msgAniversario, normalizarTelefone, waMeLink } from '@/lib/mensagens';
import { enviarTexto, evolutionConfigurada } from '@/lib/evolution';

export async function GET(req: Request) {
  if (!(await autorizadoCron(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const hoje = hojeBRT();
  const mesDia = hoje.slice(5); // MM-DD

  try {
    const supabase = await getSupabaseServiceClient();
    const { data: clientes, error } = await supabase
      .from('salon_customers')
      .select('id, name, phone, birth_date, data_nascimento');

    if (error) throw error;

    const aniversariantes = (clientes ?? []).filter(c => {
      const nasc: string | null = c.birth_date ?? c.data_nascimento ?? null;
      return Boolean(nasc) && String(nasc).slice(5) === mesDia;
    });

    const enviados: string[] = [];
    const falhas: { nome: string; error: string }[] = [];
    const itens = aniversariantes.map(c => {
      const msg = msgAniversario(c.name ?? '');
      const telefone = normalizarTelefone(c.phone ?? '');
      return {
        nome: c.name,
        telefone,
        mensagem: msg,
        wa_link: telefone ? waMeLink(telefone, msg) : '',
        enviada_via_api: false as boolean,
      };
    });

    if (evolutionConfigurada()) {
      for (const item of itens) {
        if (!item.telefone) continue;
        const r = await enviarTexto(item.telefone, item.mensagem);
        item.enviada_via_api = r.ok;
        if (r.ok) enviados.push(item.nome ?? '');
        else falhas.push({ nome: item.nome ?? '', error: r.error ?? '' });
      }
    }

    return NextResponse.json({
      ok: true,
      dia: hoje,
      total: itens.length,
      evolution_conectada: evolutionConfigurada(),
      enviados_automaticos: enviados.length,
      falhas,
      itens,
    });
  } catch (error: any) {
    console.error('[cron/aniversarios]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
