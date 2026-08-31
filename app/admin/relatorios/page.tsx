'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  TrendingUp, Users, Scissors, AlertTriangle, Calendar, Filter, 
  DollarSign, CheckCircle2, Clock, ChevronRight
} from 'lucide-react';
import { gerarRelatorioFiltrado, ReportData, TipoPeriodoRelatorio, FiltroRelatorio } from '@/lib/reports';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/mock-data';

const COLORS = ['#D4AF37', '#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];

export default function RelatoriosPage() {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const [filtroTipo, setFiltroTipo] = useState<TipoPeriodoRelatorio>('mes_atual');
  const [dataEscolhida, setDataEscolhida] = useState<string>(hoje.toISOString().split('T')[0]);
  const [mesEscolhido, setMesEscolhido] = useState<number>(mesAtual);
  const [anoEscolhido, setAnoEscolhido] = useState<number>(anoAtual);
  
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarRelatorio = async () => {
    setLoading(true);
    const filtro: FiltroRelatorio = {
      tipo: filtroTipo,
      dataEspecifica: dataEscolhida,
      mes: mesEscolhido,
      ano: anoEscolhido,
    };
    const res = await gerarRelatorioFiltrado(filtro);
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    carregarRelatorio();
  }, [filtroTipo, dataEscolhida, mesEscolhido, anoEscolhido]);

  const meses = [
    { num: 1, nome: 'Janeiro' },
    { num: 2, nome: 'Fevereiro' },
    { num: 3, nome: 'Março' },
    { num: 4, nome: 'Abril' },
    { num: 5, nome: 'Maio' },
    { num: 6, nome: 'Junho' },
    { num: 7, nome: 'Julho' },
    { num: 8, nome: 'Agosto' },
    { num: 9, nome: 'Setembro' },
    { num: 10, nome: 'Outubro' },
    { num: 11, nome: 'Novembro' },
    { num: 12, nome: 'Dezembro' },
  ];

  const anos = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1];

  return (
    <div className="py-4 space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <SectionTitle 
          title="Relatórios de Gestão" 
          subtitle="Acompanhamento estratégico do Studio Agnaldo Gomes" 
          align="left" 
        />

        {/* Período Atual Badge */}
        {data && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-right">
            <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">Período Selecionado</span>
            <span className="text-sm font-extrabold text-foreground">{data.tituloPeriodo}</span>
          </div>
        )}
      </div>

      {/* Barra de Filtros Inteligente */}
      <CardGlass className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Botões de Período Rápido */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-foreground/40 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter size={14} /> Filtro:
            </span>

            <button
              onClick={() => setFiltroTipo('mes_atual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'mes_atual' ? 'bg-primary text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Mês Atual
            </button>

            <button
              onClick={() => setFiltroTipo('mes_anterior')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'mes_anterior' ? 'bg-primary text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Mês Anterior
            </button>

            <button
              onClick={() => setFiltroTipo('ano_atual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'ano_atual' ? 'bg-primary text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Ano Atual ({anoAtual})
            </button>

            <button
              onClick={() => setFiltroTipo('ano_anterior')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'ano_anterior' ? 'bg-primary text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Ano Anterior ({anoAtual - 1})
            </button>

            <button
              onClick={() => setFiltroTipo('dia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'dia' ? 'bg-primary text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Por Data
            </button>

            <button
              onClick={() => setFiltroTipo('mes_especifico')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'mes_especifico' ? 'bg-primary text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Escolher Mês
            </button>

            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'todos' ? 'bg-primary text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Tudo
            </button>
          </div>

          {/* Seletores Específicos quando aplicável */}
          {filtroTipo === 'dia' && (
            <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 shrink-0">
              <Calendar size={15} className="text-primary" />
              <input
                type="date"
                value={dataEscolhida}
                onChange={(e) => setDataEscolhida(e.target.value)}
                className="bg-transparent text-sm text-foreground focus:outline-none [color-scheme:dark]"
              />
            </div>
          )}

          {filtroTipo === 'mes_especifico' && (
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={mesEscolhido}
                onChange={(e) => setMesEscolhido(Number(e.target.value))}
                className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                {meses.map(m => (
                  <option key={m.num} value={m.num}>{m.nome}</option>
                ))}
              </select>

              <select
                value={anoEscolhido}
                onChange={(e) => setAnoEscolhido(Number(e.target.value))}
                className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                {anos.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </CardGlass>

      {loading || !data ? (
        <div className="p-12 text-center text-foreground/50">Carregando relatório e métricas...</div>
      ) : (
        <>
          {/* KPIs Rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardGlass className="p-5 flex flex-col justify-between relative overflow-hidden border-primary/20">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/50">Faturamento Bruto</span>
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <DollarSign size={18} />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-primary">R$ {data.faturamentoBruto.toFixed(2)}</span>
                <p className="text-[11px] text-foreground/40 mt-0.5">Total faturado no período</p>
              </div>
            </CardGlass>
            
            <CardGlass className="p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/50">Atendimentos</span>
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Users size={18} />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-foreground">{data.totalAtendimentos}</span>
                <p className="text-[11px] text-foreground/40 mt-0.5">Clientes atendidos</p>
              </div>
            </CardGlass>

            <CardGlass className="p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/50">Ticket Médio</span>
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <TrendingUp size={18} />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-amber-400">R$ {data.ticketMedio.toFixed(2)}</span>
                <p className="text-[11px] text-foreground/40 mt-0.5">Média por atendimento</p>
              </div>
            </CardGlass>

            <CardGlass className="p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/50">Cancelamentos</span>
                <span className="p-2 rounded-lg bg-red-500/10 text-red-400">
                  <AlertTriangle size={18} />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-red-500">{data.totalCancelamentos}</span>
                <p className="text-[11px] text-foreground/40 mt-0.5">Cancelados ou No-show</p>
              </div>
            </CardGlass>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Distribuição de Serviços */}
            <CardGlass className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-[var(--border-subtle)] pb-2 flex items-center gap-2">
                <Scissors size={16} className="text-primary" /> Distribuição de Serviços
              </h3>
              
              {data.servicosMaisProcurados.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-foreground/40 text-sm">
                  Nenhum serviço realizado neste período.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.servicosMaisProcurados}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="quantidade"
                      >
                        {data.servicosMaisProcurados.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(val: any, name: any, item: any) => [
                          `${val} atendimentos (R$ ${item?.payload?.faturamento?.toFixed(2) || 0})`,
                          item?.payload?.nome
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardGlass>

            {/* Gráfico 2: Performance Profissional */}
            <CardGlass className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-[var(--border-subtle)] pb-2 flex items-center gap-2">
                <Users size={16} className="text-primary" /> Performance por Profissional (Faturamento)
              </h3>
              
              {data.performanceProfissionais.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-foreground/40 text-sm">
                  Nenhum atendimento registrado para os profissionais neste período.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.performanceProfissionais}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="nome" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip 
                        cursor={{ fill: '#ffffff05' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Faturamento']}
                      />
                      <Bar dataKey="faturamento" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardGlass>
          </div>

          {/* Tabela Detalhada de Atendimentos */}
          <CardGlass className="p-6">
            <div className="flex justify-between items-center mb-6 border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" /> Detalhamento dos Atendimentos ({data.itensDetalhados.length})
              </h3>
            </div>

            {data.itensDetalhados.length === 0 ? (
              <div className="text-center py-8 text-foreground/40 text-sm">
                Nenhum atendimento registrado no período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wider text-foreground/50">
                      <th className="pb-3 font-bold">Data & Hora</th>
                      <th className="pb-3 font-bold">Cliente</th>
                      <th className="pb-3 font-bold">Serviço</th>
                      <th className="pb-3 font-bold">Profissional</th>
                      <th className="pb-3 font-bold">Status</th>
                      <th className="pb-3 font-bold text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {data.itensDetalhados.map((item) => {
                      const [ano, mes, dia] = item.data.split('-');
                      const dataFormatada = `${dia}/${mes}/${ano}`;

                      return (
                        <tr key={item.id} className="hover:bg-foreground/5 transition-colors">
                          <td className="py-3.5 text-xs text-foreground/80 font-medium">
                            <span className="font-bold text-foreground block">{dataFormatada}</span>
                            <span className="text-foreground/40 text-[11px] flex items-center gap-1 mt-0.5">
                              <Clock size={11} /> {item.hora}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className="font-bold text-foreground block">{item.clienteNome}</span>
                            {item.clienteTelefone && (
                              <span className="text-[11px] text-foreground/40">{item.clienteTelefone}</span>
                            )}
                          </td>
                          <td className="py-3.5">
                            <span className="font-medium text-foreground">{item.servicoNome}</span>
                            <span className="text-[10px] text-primary/70 block uppercase">{item.categoria}</span>
                          </td>
                          <td className="py-3.5 text-foreground/80 font-medium text-xs">
                            {item.profissionalNome}
                          </td>
                          <td className="py-3.5">
                            <span 
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block"
                              style={{ 
                                backgroundColor: `${STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || '#10B981'}15`, 
                                color: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || '#10B981' 
                              }}
                            >
                              {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-extrabold text-primary">
                            R$ {item.valor.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardGlass>
        </>
      )}
    </div>
  );
}
