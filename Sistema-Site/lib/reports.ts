import { getAgendamentos, getServicos, getProfissionais, getClientes } from './mock-data';
import type { Agendamento, Servico, Profissional, Cliente } from './gestao-types';

export type TipoPeriodoRelatorio = 'dia' | 'mes_atual' | 'mes_anterior' | 'ano_atual' | 'ano_anterior' | 'mes_especifico' | 'ano_especifico' | 'personalizado' | 'todos';

export interface FiltroRelatorio {
  tipo: TipoPeriodoRelatorio;
  dataEspecifica?: string; // YYYY-MM-DD
  mes?: number; // 1..12
  ano?: number; // 2025, 2026...
  dataInicio?: string;
  dataFim?: string;
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
  status: string;
  canal: string;
}

export interface ReportData {
  tituloPeriodo: string;
  dataInicio: string;
  dataFim: string;
  faturamentoBruto: number;
  totalAtendimentos: number;
  totalCancelamentos: number;
  ticketMedio: number;
  servicosMaisProcurados: { nome: string; quantidade: number; faturamento: number; porcentagem: number }[];
  performanceProfissionais: { nome: string; atendimentos: number; faturamento: number }[];
  itensDetalhados: ItemAtendimentoRelatorio[];
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
  const cancelados = filtrados.filter(a => a.status === 'cancelado' || a.status === 'no_show');

  // Faturamento
  const faturamento = concluidos.reduce((acc, a) => {
    const s = servicos.find(s => s.id === a.servico_id);
    return acc + (s?.preco || 0);
  }, 0);

  const ticketMedio = concluidos.length > 0 ? Math.round(faturamento / concluidos.length) : 0;

  // Serviços mais procurados
  const servicosMap: Record<string, { quantidade: number; faturamento: number }> = {};
  concluidos.forEach(a => {
    const s = servicos.find(s => s.id === a.servico_id);
    const nome = s?.nome || 'Outro Serviço';
    const preco = s?.preco || 0;
    if (!servicosMap[nome]) {
      servicosMap[nome] = { quantidade: 0, faturamento: 0 };
    }
    servicosMap[nome].quantidade += 1;
    servicosMap[nome].faturamento += preco;
  });

  const servicosStats = Object.entries(servicosMap).map(([nome, item]) => ({
    nome,
    quantidade: item.quantidade,
    faturamento: item.faturamento,
    porcentagem: concluidos.length > 0 ? Math.round((item.quantidade / concluidos.length) * 100) : 0
  })).sort((a, b) => b.quantidade - a.quantidade);

  // Performance Profissionais
  const profStats = profissionais.map(p => {
    const atendimentos = concluidos.filter(a => a.profissional_id === p.id);
    const fat = atendimentos.reduce((acc, a) => {
      const s = servicos.find(s => s.id === a.servico_id);
      return acc + (s?.preco || 0);
    }, 0);
    return { nome: p.nome, atendimentos: atendimentos.length, faturamento: fat };
  }).filter(p => p.atendimentos > 0 || p.faturamento > 0);

  // Itens detalhados
  const itensDetalhados: ItemAtendimentoRelatorio[] = filtrados.map(a => {
    const cli = clientes.find(c => c.id === a.cliente_id);
    const srv = servicos.find(s => s.id === a.servico_id);
    const prof = profissionais.find(p => p.id === a.profissional_id);
    return {
      id: a.id,
      clienteNome: cli?.nome || 'Cliente',
      clienteTelefone: cli?.telefone || '',
      servicoNome: srv?.nome || 'Serviço',
      categoria: srv?.categoria || 'Geral',
      profissionalNome: prof?.nome || 'Profissional',
      data: a.data,
      hora: a.hora_inicio,
      valor: srv?.preco || 0,
      status: a.status,
      canal: a.canal,
    };
  }).sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));

  return {
    tituloPeriodo: titulo,
    dataInicio: dtInicio,
    dataFim: dtFim,
    faturamentoBruto: faturamento,
    totalAtendimentos: concluidos.length,
    totalCancelamentos: cancelados.length,
    ticketMedio,
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
