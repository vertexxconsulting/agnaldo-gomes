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
  DollarSign, CheckCircle2, Clock, ChevronRight, FileDown, Image as ImageIcon, Download,
  BarChart3, PieChart as PieIcon, Crown
} from 'lucide-react';
import { gerarRelatorioFiltrado, ReportData, TipoPeriodoRelatorio, FiltroRelatorio } from '@/lib/reports';
import { exportarRelatorioPDF, exportarRelatorioSVG } from '@/lib/export-reports';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/mock-data';

const COLORS = ['#C5A059', '#059669', '#2563EB', '#7C3AED', '#D97706', '#0891B2', '#E11D48', '#4F46E5', '#16A34A', '#64748B'];

export default function RelatoriosPage() {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const [filtroTipo, setFiltroTipo] = useState<TipoPeriodoRelatorio>('mes_atual');
  const [dataEscolhida, setDataEscolhida] = useState<string>(hoje.toISOString().split('T')[0]);
  const [mesEscolhido, setMesEscolhido] = useState<number>(mesAtual);
  const [anoEscolhido, setAnoEscolhido] = useState<number>(anoAtual);
  
  const [viewServicos, setViewServicos] = useState<'donut' | 'ranking'>('donut');
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

        {/* Ações de Exportação e Período Atual Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {data && (
            <>
              <button
                onClick={() => exportarRelatorioPDF(data)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Exportar Relatório Completo em PDF"
              >
                <FileDown size={15} /> Exportar PDF
              </button>

              <button
                onClick={() => exportarRelatorioSVG(data)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Exportar Resumo Vetorial em SVG"
              >
                <ImageIcon size={15} /> Exportar SVG
              </button>

              <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-2 text-right hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-gold tracking-wider block">Período</span>
                <span className="text-xs font-extrabold text-foreground">{data.tituloPeriodo}</span>
              </div>
            </>
          )}
        </div>
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
                filtroTipo === 'mes_atual' ? 'bg-gold text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Mês Atual
            </button>

            <button
              onClick={() => setFiltroTipo('mes_anterior')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'mes_anterior' ? 'bg-gold text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Mês Anterior
            </button>

            <button
              onClick={() => setFiltroTipo('ano_atual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'ano_atual' ? 'bg-gold text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Ano Atual ({anoAtual})
            </button>

            <button
              onClick={() => setFiltroTipo('ano_anterior')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'ano_anterior' ? 'bg-gold text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Ano Anterior ({anoAtual - 1})
            </button>

            <button
              onClick={() => setFiltroTipo('dia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'dia' ? 'bg-gold text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Por Data
            </button>

            <button
              onClick={() => setFiltroTipo('mes_especifico')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'mes_especifico' ? 'bg-gold text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Escolher Mês
            </button>

            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filtroTipo === 'todos' ? 'bg-gold text-black shadow-md' : 'bg-foreground/5 text-foreground/70 hover:text-foreground'
              }`}
            >
              Tudo
            </button>
          </div>

          {/* Seletores Específicos quando aplicável */}
          {filtroTipo === 'dia' && (
            <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 shrink-0">
              <Calendar size={15} className="text-gold" />
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
                className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-gold"
              >
                {meses.map(m => (
                  <option key={m.num} value={m.num}>{m.nome}</option>
                ))}
              </select>

              <select
                value={anoEscolhido}
                onChange={(e) => setAnoEscolhido(Number(e.target.value))}
                className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-gold"
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
            <CardGlass className="p-5 flex flex-col justify-between relative overflow-hidden border-gold/30 bg-gold/5">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Faturamento Bruto</span>
                <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                  <DollarSign size={18} />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-gold">R$ {data.faturamentoBruto.toFixed(2)}</span>
                <p className="text-[11px] text-stone-600 font-medium mt-0.5">Total faturado no período</p>
              </div>
            </CardGlass>
            
            <CardGlass className="p-5 flex flex-col justify-between bg-blue-500/5 border-blue-500/20">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Atendimentos</span>
                <span className="p-2 rounded-lg bg-blue-100 text-blue-800 border border-blue-200 shadow-xs">
                  <Users size={18} />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-foreground">{data.totalAtendimentos}</span>
                <p className="text-[11px] text-stone-600 font-medium mt-0.5">Clientes atendidos</p>
              </div>
            </CardGlass>

            <CardGlass className="p-5 flex flex-col justify-between bg-amber-500/5 border-amber-500/20">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Ticket Médio</span>
                <span className="p-2 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
                  <TrendingUp size={18} />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-amber-800">R$ {data.ticketMedio.toFixed(2)}</span>
                <p className="text-[11px] text-stone-600 font-medium mt-0.5">Média por atendimento</p>
              </div>
            </CardGlass>

            <CardGlass className="p-5 flex flex-col justify-between bg-red-500/5 border-red-500/20">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">Cancelamentos</span>
                <span className="p-2 rounded-lg bg-red-100 text-red-800 border border-red-200 shadow-xs">
                  <AlertTriangle size={18} />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-red-600">{data.totalCancelamentos}</span>
                <p className="text-[11px] text-stone-600 font-medium mt-0.5">Cancelados ou No-show</p>
              </div>
            </CardGlass>
          </div>

          {/* Gráficos */}
          {(() => {
            const totalServicosRealizados = data.servicosMaisProcurados.reduce((sum, s) => sum + s.quantidade, 0);

            // Agrupamento dos Top 5 serviços + "Demais Serviços" para o Donut ficar perfeito e nítido
            const top5 = data.servicosMaisProcurados.slice(0, 5);
            const outros = data.servicosMaisProcurados.slice(5);
            const outrosQtd = outros.reduce((acc, s) => acc + s.quantidade, 0);
            const outrosFat = outros.reduce((acc, s) => acc + s.faturamento, 0);
            const outrosPct = totalServicosRealizados > 0 ? Math.round((outrosQtd / totalServicosRealizados) * 100) : 0;

            const dadosDonut = [
              ...top5.map((s, idx) => ({
                ...s,
                cor: COLORS[idx % COLORS.length],
              })),
              ...(outros.length > 0 ? [{
                nome: `Demais Serviços (${outros.length})`,
                quantidade: outrosQtd,
                faturamento: outrosFat,
                porcentagem: outrosPct,
                cor: '#64748B',
                isOutros: true,
              }] : [])
            ];

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico 1: Distribuição de Serviços */}
                <CardGlass className="p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[var(--border-subtle)] pb-3">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                          <Scissors size={16} className="text-gold" /> Distribuição de Serviços
                        </h3>
                        <p className="text-[11px] text-foreground/50 mt-0.5">
                          Procura e representatividade por procedimento
                        </p>
                      </div>

                      {data.servicosMaisProcurados.length > 0 && (
                        <div className="flex items-center gap-1 bg-foreground/5 p-1 rounded-lg border border-border-subtle self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setViewServicos('donut')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                              viewServicos === 'donut'
                                ? 'bg-gold text-black shadow-xs'
                                : 'text-foreground/60 hover:text-foreground'
                            }`}
                          >
                            <PieIcon size={13} /> Destaques
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewServicos('ranking')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                              viewServicos === 'ranking'
                                ? 'bg-gold text-black shadow-xs'
                                : 'text-foreground/60 hover:text-foreground'
                            }`}
                          >
                            <BarChart3 size={13} /> Ranking ({data.servicosMaisProcurados.length})
                          </button>
                        </div>
                      )}
                    </div>

                    {data.servicosMaisProcurados.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-foreground/40 text-sm">
                        Nenhum serviço realizado neste período.
                      </div>
                    ) : viewServicos === 'donut' ? (
                      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                        {/* Donut com Centro Informativo */}
                        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={dadosDonut}
                                cx="50%"
                                cy="50%"
                                innerRadius={52}
                                outerRadius={78}
                                paddingAngle={3}
                                dataKey="quantidade"
                                nameKey="nome"
                                strokeWidth={2}
                                stroke="var(--color-card)"
                              >
                                {dadosDonut.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.cor} />
                                ))}
                              </Pie>
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                      <div className="bg-[var(--color-card)] p-3 rounded-xl shadow-xl border border-[var(--border-subtle)] text-xs space-y-1 z-50">
                                        <p className="font-bold text-foreground flex items-center gap-1.5">
                                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.cor }} />
                                          {item.nome}
                                        </p>
                                        <p className="text-foreground/80 font-medium">
                                          <strong className="text-foreground font-mono">{item.quantidade}</strong> atendimentos ({item.porcentagem}%)
                                        </p>
                                        <p className="font-mono text-gold-dim font-bold">
                                          Faturamento: R$ {item.faturamento.toFixed(2)}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Centro Informativo */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                            <span className="text-2xl font-black font-serif text-gold leading-none">{totalServicosRealizados}</span>
                            <span className="text-[10px] uppercase font-bold text-foreground/60 tracking-wider mt-1">Serviços</span>
                          </div>
                        </div>

                        {/* Lista dos Destaques com Barra de Progresso */}
                        <div className="flex-1 min-w-0 w-full space-y-2">
                          {dadosDonut.map((item, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-foreground/[0.02] border border-border-subtle/50 hover:bg-foreground/[0.05] transition-colors">
                              <div className="flex items-center justify-between text-xs mb-1 gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                                    style={{ backgroundColor: item.cor }} 
                                  />
                                  <span className="font-bold text-foreground truncate text-xs" title={item.nome}>
                                    {idx === 0 && '👑 '}{item.nome}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                                  <span className="font-bold text-foreground">{item.quantidade}x</span>
                                  <span className="text-foreground/50">({item.porcentagem}%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-foreground/10 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.max(item.porcentagem, 3)}%`, backgroundColor: item.cor }} 
                                />
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-foreground/50 mt-1">
                                <span>Faturamento:</span>
                                <span className="font-mono font-bold text-foreground/80">
                                  R$ {item.faturamento.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.servicosMaisProcurados.map((item, idx) => {
                          const maxQtd = data.servicosMaisProcurados[0]?.quantidade || 1;
                          const relPct = Math.round((item.quantidade / maxQtd) * 100);
                          const cor = COLORS[idx % COLORS.length];
                          return (
                            <div key={idx} className="p-2 rounded-lg bg-foreground/[0.02] border border-border-subtle/50 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                                  idx === 0 ? 'bg-gold text-black font-extrabold' : idx === 1 ? 'bg-stone-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-foreground/10 text-foreground/70'
                                }`}>
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className="font-bold text-foreground truncate" title={item.nome}>
                                      {item.nome}
                                    </span>
                                    <span className="font-mono text-foreground/80 shrink-0 ml-2 font-bold text-[11px]">
                                      {item.quantidade}x ({item.porcentagem}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-foreground/10 rounded-full h-1.5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${relPct}%`, backgroundColor: cor }} />
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 font-mono text-[11px]">
                                <span className="font-bold text-gold-dim block">R$ {item.faturamento.toFixed(2)}</span>
                                <span className="text-[10px] text-foreground/40 block">Méd: R$ {(item.faturamento / Math.max(item.quantidade, 1)).toFixed(0)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardGlass>

                {/* Gráfico 2: Performance Profissional */}
                <CardGlass className="p-6 flex flex-col justify-between">
                  <div>
                    <div className="mb-5 border-b border-[var(--border-subtle)] pb-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
                        <Users size={16} className="text-gold" /> Performance por Profissional
                      </h3>
                      <p className="text-[11px] text-foreground/50 mt-0.5">
                        Faturamento bruto gerado por cada membro da equipe
                      </p>
                    </div>
                    
                    {data.performanceProfissionais.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-foreground/40 text-sm">
                        Nenhum atendimento registrado para os profissionais neste período.
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.performanceProfissionais} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(20, 18, 14, 0.08)" vertical={false} />
                            <XAxis 
                              dataKey="nome" 
                              stroke="var(--foreground)" 
                              opacity={0.7} 
                              fontSize={11} 
                              tickLine={false} 
                              axisLine={false} 
                            />
                            <YAxis 
                              stroke="var(--foreground)" 
                              opacity={0.7} 
                              fontSize={11} 
                              tickLine={false} 
                              axisLine={false} 
                              tickFormatter={(v) => `R$${v}`} 
                            />
                            <Tooltip 
                              cursor={{ fill: 'var(--foreground)', opacity: 0.04 }}
                              contentStyle={{ 
                                backgroundColor: 'var(--color-card)', 
                                color: 'var(--foreground)', 
                                border: '1px solid var(--border-subtle)', 
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                              }}
                              itemStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                              formatter={(val: any, name: any, item: any) => [
                                `R$ ${Number(val).toFixed(2)} (${item?.payload?.atendimentos || 0} atendimentos)`,
                                'Faturamento'
                              ]}
                            />
                            <Bar dataKey="faturamento" radius={[6, 6, 0, 0]}>
                              {data.performanceProfissionais.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </CardGlass>
              </div>
            );
          })()}

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
                          <td className="py-3.5 text-right font-extrabold text-gold">
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
