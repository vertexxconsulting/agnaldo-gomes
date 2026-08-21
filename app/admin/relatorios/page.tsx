'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { TrendingUp, Users, Calendar, Scissors, AlertTriangle, MessageSquare, Power } from 'lucide-react';
import { gerarRelatorio, ReportData } from '@/lib/reports';

const COLORS = ['#D4AF37', '#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#9333EA'];

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState<'diario' | 'semanal' | 'mensal'>('diario');
  const [data, setData] = useState<ReportData | null>(null);
  const [assistenteAtiva, setAssistenteAtiva] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await gerarRelatorio(periodo, new Date().toISOString().split('T')[0]);
      setData(res);
      setLoading(false);
    };
    load();
  }, [periodo]);

  if (loading || !data) return <div className="p-8 text-center">Gerando relatório visual...</div>;

  return (
    <div className="py-4 space-y-8">
      <div className="flex justify-between items-end">
        <SectionTitle 
          title="Relatórios de Gestão" 
          subtitle="Acompanhamento estratégico do Studio Agnaldo Gomes" 
          align="left" 
        />
        
        <div className="flex gap-2 bg-[var(--color-card)] p-1 rounded-lg border border-[var(--border-subtle)]">
          {(['diario', 'semanal', 'mensal'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                periodo === p ? 'bg-primary text-black' : 'text-foreground/50 hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardGlass className="p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Faturamento Bruto</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-primary">R$ {data.faturamentoBruto.toFixed(2)}</span>
            <TrendingUp size={20} className="text-emerald-500" />
          </div>
        </CardGlass>
        
        <CardGlass className="p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Atendimentos</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-foreground">{data.totalAtendimentos}</span>
            <Users size={20} className="text-blue-500" />
          </div>
        </CardGlass>

        <CardGlass className="p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Serviços Realizados</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-foreground">{data.servicosMaisProcurados.reduce((a, b) => a + b.quantidade, 0)}</span>
            <Scissors size={20} className="text-amber-500" />
          </div>
        </CardGlass>

        <CardGlass className="p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Cancelamentos</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-red-500">{data.totalCancelamentos}</span>
            <AlertTriangle size={20} className="text-red-500" />
          </div>
        </CardGlass>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardGlass className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-[var(--border-subtle)] pb-2">Distribuição de Serviços</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.servicosMaisProcurados}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="quantidade"
                >
                  {data.servicosMaisProcurados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardGlass>

        <CardGlass className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-6 border-b border-[var(--border-subtle)] pb-2">Performance Profissional (Faturamento)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.performanceProfissionais}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="nome" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Bar dataKey="faturamento" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardGlass>
      </div>

      {/* Controle Assistente IA */}
      <CardGlass className="p-6 border-primary/30 bg-primary/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${assistenteAtiva ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Assistente de Gestão Inteligente</h3>
              <p className="text-sm text-foreground/60">
                {assistenteAtiva 
                  ? "A IA está monitorando os atendimentos e gerando recomendações para a secretaria." 
                  : "A assistente está desativada. Relatórios automáticos e suporte à secretaria suspensos."}
              </p>
            </div>
          </div>
          <Button 
            variant={assistenteAtiva ? "outline" : "primary"} 
            className="flex items-center gap-2"
            onClick={() => setAssistenteAtiva(!assistenteAtiva)}
          >
            <Power size={18} />
            {assistenteAtiva ? "Desativar Assistente" : "Ativar Assistente"}
          </Button>
        </div>
      </CardGlass>
    </div>
  );
}
