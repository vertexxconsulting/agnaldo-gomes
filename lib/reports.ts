import { getAgendamentos, getServicos, getProfissionais } from './mock-data';
import type { Agendamento, Servico, Profissional } from './gestao-types';

export interface ReportData {
  periodo: 'diario' | 'semanal' | 'mensal';
  dataInicio: string;
  dataFim: string;
  faturamentoBruto: number;
  totalAtendimentos: number;
  totalCancelamentos: number;
  servicosMaisProcurados: { nome: string; quantidade: number; porcentagem: number }[];
  performanceProfissionais: { nome: string; atendimentos: number; faturamento: number }[];
  motivosCancelamento: { motivo: string; quantidade: number }[];
}

export async function gerarRelatorio(periodo: 'diario' | 'semanal' | 'mensal', dataReferencia: string): Promise<ReportData> {
  const agendamentos = await getAgendamentos();
  const servicos = await getServicos();
  const profissionais = await getProfissionais();

  // Filtrar por período (simplificado para o mock)
  const filtrados = agendamentos.filter(a => {
    if (periodo === 'diario') return a.data === dataReferencia;
    // Lógica semanal/mensal real viria aqui com queries Supabase
    return true; 
  });

  const concluidos = filtrados.filter(a => a.status === 'concluido' || a.status === 'confirmado');
  const cancelados = filtrados.filter(a => a.status === 'cancelado');

  // Faturamento
  const faturamento = concluidos.reduce((acc, a) => {
    const s = servicos.find(s => s.id === a.servico_id);
    return acc + (s?.preco || 0);
  }, 0);

  // Serviços
  const servicosMap: Record<string, number> = {};
  concluidos.forEach(a => {
    const s = servicos.find(s => s.id === a.servico_id);
    if (s) servicosMap[s.nome] = (servicosMap[s.nome] || 0) + 1;
  });

  const servicosStats = Object.entries(servicosMap).map(([nome, quantidade]) => ({
    nome,
    quantidade,
    porcentagem: (quantidade / concluidos.length) * 100
  })).sort((a, b) => b.quantidade - a.quantidade);

  // Profissionais
  const profStats = profissionais.map(p => {
    const atendimentos = concluidos.filter(a => a.profissional_id === p.id);
    const fat = atendimentos.reduce((acc, a) => {
      const s = servicos.find(s => s.id === a.servico_id);
      return acc + (s?.preco || 0);
    }, 0);
    return { nome: p.nome, atendimentos: atendimentos.length, faturamento: fat };
  }).filter(p => p.atendimentos > 0);

  return {
    periodo,
    dataInicio: dataReferencia,
    dataFim: dataReferencia,
    faturamentoBruto: faturamento,
    totalAtendimentos: concluidos.length,
    totalCancelamentos: cancelados.length,
    servicosMaisProcurados: servicosStats,
    performanceProfissionais: profStats,
    motivosCancelamento: [
      { motivo: 'Imprevisto pessoal', quantidade: 2 },
      { motivo: 'Doença', quantidade: 1 }
    ]
  };
}
