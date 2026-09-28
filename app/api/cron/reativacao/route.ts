/**
 * CRON mensal (dia 1 às 10h BRT): reengajamento de clientes inativos há 90+ dias.
 * Envia via Evolution API quando configurada; sempre retorna links wa.me
 * como fallback de disparo manual.
 */
import { NextResponse } from 'next/server';
import { autorizadoCron, hojeBRT } from '@/lib/cron-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { msgReativacao, normalizarTelefone, waMeLink } from '@/lib/mensagens';
import { enviarTexto, evolutionConfigurada } from '@/lib/evolution';

const DIAS_INATIVO = 90;

export async function GET(req: Request) {
  if (!(await autorizadoCron(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const hoje = hojeBRT();
  const corteData = new Date(`${hoje}T12:00:00`);
  corteData.setDate(corteData.getDate() - DIAS_INATIVO);
  const corteISO = corteData.toISOString().slice(0, 10);

  try {
    const supabase = await getSupabaseServiceClient();

    // 1. Todos os clientes com telefone
    const { data: clientes, error: errClientes } = await supabase
      .from('salon_customers')
      .select('id, name, phone')
      .not('phone', 'is', null);

    if (errClientes) throw errClientes;

    // 2. Último agendamento CONCLUÍDO de cada cliente
    const { data: agendamentos, error: errAgs } = await supabase
      .from('salon_appointments')
      .select('customer_id, date, status')
      .eq('status', 'COMPLETED')
      .order('date', { ascending: false });

    if (errAgs) throw errAgs;

    const ultimaConclusaoPorCliente = new Map<string, string>();
    for (const a of (agendamentos ?? []) as any[]) {
      if (!a.customer_id) continue;
      if (!ultimaConclusaoPorCliente.has(a.customer_id)) {
        ultimaConclusaoPorCliente.set(a.customer_id, a.date);
      }
    }

    // 3. Filtrar clientes inativos (nunca concluíram ou última conclusão > 90 dias)
    const inativos = (clientes ?? []).filter(c => {
      const ultima = ultimaConclusaoPorCliente.get(c.id);
      if (!ultima) return true; // nunca fez serviço concluído
      return ultima < corteISO;
    });

    // 4. Montar mensagens
    const itens = inativos.map(c => {
      const ultima = ultimaConclusaoPorCliente.get(c.id);
      let dias: number | null = null;
      if (ultima) {
        const diff = Date.now() - new Date(`${ultima}T12:00:00`).getTime();
        dias = Math.floor(diff / (24 * 3600 * 1000));
      }
      const msg = msgReativacao(c.name ?? '', dias ?? DIAS_INATIVO);
      const telefone = normalizarTelefone(c.phone ?? '');
      return {
        id: c.id,
        nome: c.name,
        telefone,
        diasDesdeUltima: dias,
        mensagem: msg,
        wa_link: telefone ? waMeLink(telefone, msg) : '',
        enviada_via_api: false as boolean,
      };
    });

    // 5. Disparar via Evolution API
    const falhas: { nome: string; error: string }[] = [];
    let enviadosAutomaticos = 0;

    if (evolutionConfigurada()) {
      for (const item of itens) {
        if (!item.telefone) continue;
        const r = await enviarTexto(item.telefone, item.mensagem);
        item.enviada_via_api = r.ok;
        if (r.ok) enviadosAutomaticos++;
        else falhas.push({ nome: item.nome ?? '', error: r.error ?? '' });
      }
    }

    return NextResponse.json({
      ok: true,
      referencia: { hoje, corte: corteISO, diasInativo: DIAS_INATIVO },
      total: itens.length,
      evolution_conectada: evolutionConfigurada(),
      enviados_automaticos: enviadosAutomaticos,
      falhas,
      itens,
    });
  } catch (error: any) {
    console.error('[cron/reativacao]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}