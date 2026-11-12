import { getAgendamentos, getServicos, getProfissionais, getClientes } from './mock-data';
import type { Agendamento, Servico, Profissional, Cliente, InsumoAtendimento } from './gestao-types';

export type TipoPeriodoRelatorio = 'dia' | 'mes_atual' | 'mes_anterior' | 'ano_atual' | 'ano_anterior' | 'mes_especifico' | 'ano_especifico' | 'personalizado' | 'todos';

export interface FiltroRelatorio {
  tipo: TipoPeriodoRelatorio;
  dataEspecifica?: string; // YYYY-MM-DD
  mes?: number; // 1..12
  ano?: number; // 2025, 2026...
  dataInicio?: string;
  dataFim?: string;
}

export interface ItemInsumoRelatorio {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custoUnitario: number;
  custoTotal: number;
}

export interface ResumoInsumoRecompra {
  id: string;
  nome: string;
  unidade: string;
  quantidadeTotal: number;
  custoUnitarioMedio: number;
  atendimentos: number;
  custoTotalRecompra: number;
  porcentagem: number;
}

export interface ItemAtendimentoRelatorio {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  categoria: string;
  profissionalNome: string;
  data: string;
  hora: string;
  valor: number;
  custoInsumos: number;
  valorLiquidoSemInsumos: number;
  insumos: ItemInsumoRelatorio[];
  status: string;
  canal: string;
}

export interface ReportData {
  tituloPeriodo: string;
  dataInicio: string;
  dataFim: string;
  faturamentoBruto: number;
  totalInsumosRecompra: number;
  faturamentoLiquidoSemInsumos: number;
  atendimentosComInsumos: number;
  totalAtendimentos: number;
  totalCancelamentos: number;
  ticketMedio: number;
  insumosParaRecompra: ResumoInsumoRecompra[];
  servicosMaisProcurados: { nome: string; quantidade: number; faturamento: number; insumosGastos: number; porcentagem: number }[];
  performanceProfissionais: { nome: string; atendimentos: number; faturamento: number; insumosGastos: number; faturamentoLiquidoSemInsumos: number }[];
  itensDetalhados: ItemAtendimentoRelatorio[];
}

function extrairInsumosDoAgendamento(a: Agendamento): { custoTotal: number; itens: ItemInsumoRelatorio[] } {
  if (a.unificado_em_id) {
    return { custoTotal: 0, itens: [] };
  }

  const rawList: InsumoAtendimento[] =
    (a.comanda_unificada?.insumos && a.comanda_unificada.insumos.length > 0)
      ? a.comanda_unificada.insumos
      : (Array.isArray(a.insumos_detalhes) ? a.insumos_detalhes : []);

  const itens: ItemInsumoRelatorio[] = rawList.map((ins: any, idx: number) => {
    const qtd = Number(ins.qty_used ?? ins.quantidade ?? 1);
    const unitCost = Number(ins.price_per_gram ?? ins.custo_unitario ?? 0);
    const total = ins.custo_total != null ? Number(ins.custo_total) : Number((qtd * unitCost).toFixed(2));
    return {
      id: String(ins.inventory_id || `ins_${idx}`),
      nome: String(ins.name || ins.nome || 'Insumo de Procedimento'),
      quantidade: Number(qtd.toFixed(2)),
      unidade: String(ins.unit || ins.unidade || 'g'),
      custoUnitario: Number(unitCost.toFixed(4)),
      custoTotal: Number(total.toFixed(2)),
    };
  });

  const somaItens = Number(itens.reduce((acc, i) => acc + i.custoTotal, 0).toFixed(2));
  const custoDeclarado = Number(a.product_cost ?? a.comanda_unificada?.total_insumos ?? 0);
  const custoFinal = Math.max(somaItens, custoDeclarado);

  if (custoFinal > 0 && itens.length === 0) {
    itens.push({
      id: 'reserva_insumos_procedimento',
      nome: 'Insumos de Procedimento (Taxa / Reserva)',
      quantidade: 1,
      unidade: 'serv.',
      custoUnitario: Number(custoFinal.toFixed(2)),
      custoTotal: Number(custoFinal.toFixed(2)),
    });
  } else if (custoFinal > somaItens + 0.01) {
    const diff = Number((custoFinal - somaItens).toFixed(2));
    itens.push({
      id: 'complemento_reserva_insumos',
      nome: 'Reserva Complementar de Insumos',
      quantidade: 1,
      unidade: 'serv.',
      custoUnitario: diff,
      custoTotal: diff,
    });
  }

  return {
    custoTotal: Number(custoFinal.toFixed(2)),
    itens,
  };
}

function obterValorEfetivoAgendamento(a: Agendamento, servicos: Servico[]): number {
  if (a.unificado_em_id) return 0;
  if (a.total_amount != null && Number(a.total_amount) > 0) {
    return Number(a.total_amount);
  }
  const comandaAny = a.comanda_unificada as any;
  if (comandaAny?.valor_final_cliente != null && Number(comandaAny.valor_final_cliente) > 0) {
    return Number(comandaAny.valor_final_cliente);
  }
  if (comandaAny?.total_liquido != null && Number(comandaAny.total_liquido) > 0) {
    return Number(comandaAny.total_liquido);
  }
  const s = servicos.find(sv => sv.id === a.servico_id);
  const base = s?.preco || 0;
  const subs = Array.isArray(a.sub_servicos) ? a.sub_servicos : [];
  const somaSubs = subs.reduce((acc: number, sub: any) => {
    if (sub?._meta) return acc;
    if (typeof sub === 'object' && sub?.is_free) return acc;
    if (typeof sub === 'object' && sub?.preco != null) return acc + Number(sub.preco);
    const subSrv = servicos.find(sv => sv.id === (typeof sub === 'string' ? sub : sub?.id));
    return acc + (subSrv?.preco || 0);
  }, 0);
  const desc = Number(a.desconto_valor || 0);
  return Math.max(0, Number((base + somaSubs - desc).toFixed(2)));
}

export async function gerarRelatorioFiltrado(filtro: FiltroRelatorio): Promise<ReportData> {
  const [agendamentos, servicos, profissionais, clientes] = await Promise.all([
    getAgendamentos(),
    getServicos(),
    getProfissionais(),
    getClientes(),
  ]);

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1; // 1-12

  let dtInicio = '';
  let dtFim = '';
  let titulo = '';

  switch (filtro.tipo) {
    case 'dia': {
      const d = filtro.dataEspecifica || hoje.toISOString().split('T')[0];
      dtInicio = d;
      dtFim = d;
      const [ano, mes, dia] = d.split('-');
      titulo = `Dia ${dia}/${mes}/${ano}`;
      break;
    }
    case 'mes_atual': {
      const strMes = String(mesAtual).padStart(2, '0');
      dtInicio = `${anoAtual}-${strMes}-01`;
      const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();
      dtFim = `${anoAtual}-${strMes}-${String(ultimoDia).padStart(2, '0')}`;
      const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(hoje);
      titulo = `Mês Atual (${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${anoAtual})`;
      break;
    }
    case 'mes_anterior': {
      const dtMesAnt = new Date(anoAtual, mesAtual - 2, 1);
      const anoAnt = dtMesAnt.getFullYear();
      const mesAnt = dtMesAnt.getMonth() + 1;
      const strMesAnt = String(mesAnt).padStart(2, '0');
      dtInicio = `${anoAnt}-${strMesAnt}-01`;
      const ultimoDiaAnt = new Date(anoAnt, mesAnt, 0).getDate();
      dtFim = `${anoAnt}-${strMesAnt}-${String(ultimoDiaAnt).padStart(2, '0')}`;
      const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dtMesAnt);
      titulo = `Mês Anterior (${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${anoAnt})`;
      break;
    }
    case 'mes_especifico': {
      const ano = filtro.ano || anoAtual;
      const mes = filtro.mes || mesAtual;
      const strMes = String(mes).padStart(2, '0');
      dtInicio = `${ano}-${strMes}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      dtFim = `${ano}-${strMes}-${String(ultimoDia).padStart(2, '0')}`;
      const dRef = new Date(ano, mes - 1, 1);
      const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dRef);
      titulo = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano}`;
      break;
    }
    case 'ano_atual': {
      dtInicio = `${anoAtual}-01-01`;
      dtFim = `${anoAtual}-12-31`;
      titulo = `Ano Atual (${anoAtual})`;
      break;
    }
    case 'ano_anterior': {
      const anoAnt = anoAtual - 1;
      dtInicio = `${anoAnt}-01-01`;
      dtFim = `${anoAnt}-12-31`;
      titulo = `Ano Anterior (${anoAnt})`;
      break;
    }
    case 'ano_especifico': {
      const ano = filtro.ano || anoAtual;
      dtInicio = `${ano}-01-01`;
      dtFim = `${ano}-12-31`;
      titulo = `Ano de ${ano}`;
      break;
    }
    case 'personalizado': {
      dtInicio = filtro.dataInicio || '2020-01-01';
      dtFim = filtro.dataFim || '2030-12-31';
      titulo = `Período: ${dtInicio.split('-').reverse().join('/')} até ${dtFim.split('-').reverse().join('/')}`;
      break;
    }
    case 'todos':
    default: {
      dtInicio = '2000-01-01';
      dtFim = '2099-12-31';
      titulo = 'Histórico Geral Completo';
      break;
    }
  }

  // Filtrar agendamentos pelo intervalo de datas
  const filtrados = agendamentos.filter(a => {
    if (!a.data) return false;
    return a.data >= dtInicio && a.data <= dtFim;
  });

  const concluidos = filtrados.filter(a => a.status === 'concluido' || a.status === 'confirmado' || a.status === 'em_atendimento');
  const concluidosPrincipais = concluidos.filter(a => !a.unificado_em_id);
  const cancelados = filtrados.filter(a => a.status === 'cancelado' || a.status === 'no_show');

  // Faturamento Bruto & Fundo de Recompra de Insumos
  const faturamento = Number(concluidosPrincipais.reduce((acc, a) => {
    return acc + obterValorEfetivoAgendamento(a, servicos);
  }, 0).toFixed(2));

  let totalInsumosRecompra = 0;
  let atendimentosComInsumos = 0;
  const insumosMap: Record<string, {
    id: string;
    nome: string;
    unidade: string;
    quantidadeTotal: number;
    somaCustoUnitario: number;
    ocorrencias: number;
    atendimentosIds: Set<string>;
    custoTotalRecompra: number;
  }> = {};

  concluidosPrincipais.forEach(a => {
    const { custoTotal, itens } = extrairInsumosDoAgendamento(a);
    if (custoTotal > 0) {
      totalInsumosRecompra = Number((totalInsumosRecompra + custoTotal).toFixed(2));
      atendimentosComInsumos += 1;
    }
    itens.forEach(item => {
      if (item.custoTotal <= 0 && item.quantidade <= 0) return;
      const key = `${item.nome.trim().toLowerCase()}__${item.unidade.trim().toLowerCase()}`;
      if (!insumosMap[key]) {
        insumosMap[key] = {
          id: item.id,
          nome: item.nome,
          unidade: item.unidade,
          quantidadeTotal: 0,
          somaCustoUnitario: 0,
          ocorrencias: 0,
          atendimentosIds: new Set<string>(),
          custoTotalRecompra: 0,
        };
      }
      insumosMap[key].quantidadeTotal = Number((insumosMap[key].quantidadeTotal + item.quantidade).toFixed(2));
      insumosMap[key].somaCustoUnitario += item.custoUnitario;
      insumosMap[key].ocorrencias += 1;
      insumosMap[key].atendimentosIds.add(a.id);
      insumosMap[key].custoTotalRecompra = Number((insumosMap[key].custoTotalRecompra + item.custoTotal).toFixed(2));
    });
  });

  const faturamentoLiquidoSemInsumos = Math.max(0, Number((faturamento - totalInsumosRecompra).toFixed(2)));
  const ticketMedio = concluidosPrincipais.length > 0 ? Math.round(faturamento / concluidosPrincipais.length) : 0;

  const insumosParaRecompra: ResumoInsumoRecompra[] = Object.values(insumosMap)
    .map(item => ({
      id: item.id,
      nome: item.nome,
      unidade: item.unidade,
      quantidadeTotal: item.quantidadeTotal,
      custoUnitarioMedio: item.ocorrencias > 0 ? Number((item.somaCustoUnitario / item.ocorrencias).toFixed(4)) : 0,
      atendimentos: item.atendimentosIds.size,
      custoTotalRecompra: item.custoTotalRecompra,
      porcentagem: totalInsumosRecompra > 0 ? Math.round((item.custoTotalRecompra / totalInsumosRecompra) * 100) : 0,
    }))
    .sort((a, b) => b.custoTotalRecompra - a.custoTotalRecompra);

  // Serviços mais procurados
  const servicosMap: Record<string, { quantidade: number; faturamento: number; insumosGastos: number }> = {};
  concluidosPrincipais.forEach(a => {
    const s = servicos.find(s => s.id === a.servico_id);
    const nome = s?.nome || 'Outro Serviço';
    const preco = obterValorEfetivoAgendamento(a, servicos);
    const { custoTotal: custoIns } = extrairInsumosDoAgendamento(a);
    if (!servicosMap[nome]) {
      servicosMap[nome] = { quantidade: 0, faturamento: 0, insumosGastos: 0 };
    }
    servicosMap[nome].quantidade += 1;
    servicosMap[nome].faturamento = Number((servicosMap[nome].faturamento + preco).toFixed(2));
    servicosMap[nome].insumosGastos = Number((servicosMap[nome].insumosGastos + custoIns).toFixed(2));
  });

  const servicosStats = Object.entries(servicosMap).map(([nome, item]) => ({
    nome,
    quantidade: item.quantidade,
    faturamento: item.faturamento,
    insumosGastos: item.insumosGastos,
    porcentagem: concluidosPrincipais.length > 0 ? Math.round((item.quantidade / concluidosPrincipais.length) * 100) : 0
  })).sort((a, b) => b.quantidade - a.quantidade);

  // Performance Profissionais
  const profStats = profissionais.map(p => {
    const atendimentos = concluidosPrincipais.filter(a => a.profissional_id === p.id);
    const fat = Number(atendimentos.reduce((acc, a) => {
      return acc + obterValorEfetivoAgendamento(a, servicos);
    }, 0).toFixed(2));
    const insGastos = Number(atendimentos.reduce((acc, a) => {
      return acc + extrairInsumosDoAgendamento(a).custoTotal;
    }, 0).toFixed(2));
    return {
      nome: p.nome,
      atendimentos: atendimentos.length,
      faturamento: fat,
      insumosGastos: insGastos,
      faturamentoLiquidoSemInsumos: Math.max(0, Number((fat - insGastos).toFixed(2))),
    };
  }).filter(p => p.atendimentos > 0 || p.faturamento > 0);

  // Itens detalhados (excluindo linhas secundárias unificadas para não duplicar faturamento/insumos)
  const itensDetalhados: ItemAtendimentoRelatorio[] = filtrados
    .filter(a => !a.unificado_em_id)
    .map(a => {
      const cli = clientes.find(c => c.id === a.cliente_id);
      const srv = servicos.find(s => s.id === a.servico_id);
      const prof = profissionais.find(p => p.id === a.profissional_id);
      const val = obterValorEfetivoAgendamento(a, servicos);
      const { custoTotal: custoIns, itens: listaIns } = extrairInsumosDoAgendamento(a);
      return {
        id: a.id,
        clienteNome: cli?.nome || 'Cliente',
        clienteTelefone: cli?.telefone || '',
        servicoNome: srv?.nome || 'Serviço',
        categoria: srv?.categoria || 'Geral',
        profissionalNome: prof?.nome || 'Profissional',
        data: a.data,
        hora: a.hora_inicio,
        valor: val,
        custoInsumos: custoIns,
        valorLiquidoSemInsumos: Math.max(0, Number((val - custoIns).toFixed(2))),
        insumos: listaIns,
        status: a.status,
        canal: a.canal,
      };
    }).sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));

  return {
    tituloPeriodo: titulo,
    dataInicio: dtInicio,
    dataFim: dtFim,
    faturamentoBruto: faturamento,
    totalInsumosRecompra,
    faturamentoLiquidoSemInsumos,
    atendimentosComInsumos,
    totalAtendimentos: concluidosPrincipais.length,
    totalCancelamentos: cancelados.length,
    ticketMedio,
    insumosParaRecompra,
    servicosMaisProcurados: servicosStats,
    performanceProfissionais: profStats,
    itensDetalhados,
  };
}

// Compatibilidade
export async function gerarRelatorio(periodo: 'diario' | 'semanal' | 'mensal', dataReferencia: string): Promise<ReportData> {
  const tipo = periodo === 'diario' ? 'dia' : periodo === 'mensal' ? 'mes_atual' : 'mes_atual';
  return gerarRelatorioFiltrado({ tipo, dataEspecifica: dataReferencia });
}
