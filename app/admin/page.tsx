'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';
import {
  Users, Wallet, BarChart3, TrendingUp, CalendarDays, CheckCircle2, XCircle, MessageSquare
} from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { getClientes, getAgendamentos, getServicos, getServicoNome, getClienteNome } from '@/lib/mock-data';
import type { Cliente, Agendamento, Servico } from '@/lib/mock-data';

const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const mesNome = (i: number) => meses[i] ?? `M${i + 1}`;
const CORES_PIE = ['#d4af37', '#10B981', '#0ea5e9', '#EF4444', '#8b5cf6', '#f59e0b'];

export default function AdminDashboardPage() {
  const [clientesData, setClientesData] = useState<Cliente[]>([]);
  const [agendamentosData, setAgendamentosData] = useState<Agendamento[]>([]);
  const [servicosData, setServicosData] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const [clientes, agendamentos, servicos] = await Promise.all([
        getClientes(),
        getAgendamentos(),
        getServicos(),
      ]);
      setClientesData(clientes);
      setAgendamentosData(agendamentos);
      setServicosData(servicos);
      setLoading(false);
    };
    carregarDados();
  }, []);

  const hoje = new Date().toISOString().split('T')[0];
  const mesAtual = hoje.slice(0, 7);
  const anoAtual = hoje.slice(0, 4);

  const kpis = useMemo(() => {
    const valorServico = (id: string) => servicosData.find(s => s.id === id)?.preco ?? 0;
    // Apenas concluídos para faturamento
    const concluidos = agendamentosData.filter(a => a.status === 'concluido');
    const faturamentos = concluidos.map(a => ({ ...a, valor: valorServico(a.servico_id) }));
    
    const hojeV = faturamentos.filter(a => a.data === hoje).reduce((s, a) => s + a.valor, 0);
    const mesV = faturamentos.filter(a => a.data.slice(0, 7) === mesAtual).reduce((s, a) => s + a.valor, 0);
    const anoV = faturamentos.filter(a => a.data.slice(0, 4) === anoAtual).reduce((s, a) => s + a.valor, 0);

    // Agendamentos hoje (todos)
    const agendadosHoje = agendamentosData.filter(a => a.data === hoje);
    const concluidosHoje = agendadosHoje.filter(a => a.status === 'concluido').length;
    const canceladosHoje = agendadosHoje.filter(a => a.status === 'cancelado' || a.status === 'no_show').length;

    // Faturamento por Mês
    const porMes = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      const chave = `${anoAtual}-${m}`;
      const valor = faturamentos.filter(a => a.data.slice(0, 7) === chave).reduce((s, a) => s + a.valor, 0);
      return { label: mesNome(i), valor };
    });

    // Distribuição por serviço no mês
    const porServicoMap = new Map<string, number>();
    faturamentos.filter(a => a.data.slice(0, 7) === mesAtual).forEach(a => {
      const nome = getServicoNome(a.servico_id);
      porServicoMap.set(nome, (porServicoMap.get(nome) ?? 0) + a.valor);
    });
    const porServico = [...porServicoMap.entries()].map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 6);

    return { hojeV, mesV, anoV, porMes, porServico, agendadosHoje: agendadosHoje.length, concluidosHoje, canceladosHoje, clientesCount: clientesData.length };
  }, [agendamentosData, clientesData, servicosData, hoje, mesAtual, anoAtual]);

  // Lógica para Notificações do WhatsApp (Simulação)
  const agendamentosDoDia = useMemo(() => agendamentosData.filter(a => a.data === hoje), [agendamentosData, hoje]);
  const automáticos = agendamentosDoDia.filter(a => a.status === 'confirmado');
  const [pendentesManuais, setPendentesManuais] = useState(() => 
    agendamentosDoDia.filter(a => a.status === 'pendente').map(a => ({
      ...a,
      clienteNome: getClienteNome(a.cliente_id),
      servicoNome: getServicoNome(a.servico_id)
    }))
  );

  const handleDisparoManual = (id: string) => {
    alert("Mensagem enviada com sucesso pela Evolution API!");
    setPendentesManuais(prev => prev.filter(a => a.id !== id));
  };

  const cards = [
    { label: 'Faturamento hoje', valor: `R$ ${kpis.hojeV}`, icon: Wallet, cor: '#d4af37' },
    { label: 'Faturamento do mês', valor: `R$ ${kpis.mesV}`, icon: TrendingUp, cor: '#10B981' },
    { label: 'Agendamentos (hoje)', valor: `${kpis.agendadosHoje}`, icon: CalendarDays, cor: '#0ea5e9' },
    { label: 'Clientes cadastrados', valor: `${kpis.clientesCount}`, icon: Users, cor: '#8b5cf6' },
  ];

  return (
    <div className="flex flex-col w-full py-4">
      <SectionTitle title="Dashboard" subtitle="Visão geral do seu negócio" align="left" size="sm" />

      {loading && (
        <div className="text-center py-8 text-foreground/50">Carregando dados do painel...</div>
      )}

      {/* Cards KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <CardGlass key={i} className="flex flex-col gap-1 p-3">
              <div className="flex items-center gap-2 mb-0.5">
                <Icon size={14} style={{ color: c.cor }} />
                <span className="text-[9px] text-foreground/60 font-semibold uppercase tracking-wider">{c.label}</span>
              </div>
              <span className="text-xl font-bold text-foreground">{c.valor}</span>
            </CardGlass>
          );
        })}
      </div>

      {/* Status do dia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <CardGlass className="flex items-center justify-between p-3 bg-emerald-500/5 border-emerald-500/20">
          <div>
            <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Concluídos Hoje</span>
            <div className="text-lg font-bold mt-0.5">{kpis.concluidosHoje}</div>
          </div>
          <CheckCircle2 size={20} className="text-emerald-500/50" />
        </CardGlass>
        <CardGlass className="flex items-center justify-between p-3 bg-red-500/5 border-red-500/20">
          <div>
            <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Cancelados / No-show</span>
            <div className="text-lg font-bold mt-0.5">{kpis.canceladosHoje}</div>
          </div>
          <XCircle size={20} className="text-red-500/50" />
        </CardGlass>
        <CardGlass className="flex items-center justify-between p-3 bg-sky-500/5 border-sky-500/20">
          <div>
            <span className="text-[9px] text-sky-500 font-bold uppercase tracking-wider">Ticket Médio (Mês)</span>
            <div className="text-4xl font-bold text-sky-500 mb-1">R$ {kpis.mesV > 0 && agendamentosData.filter(a=>a.data.slice(0,7) === mesAtual && a.status === 'concluido').length > 0 ? Math.round(kpis.mesV / agendamentosData.filter(a=>a.data.slice(0,7) === mesAtual && a.status === 'concluido').length) : 0}</div>
          </div>
          <BarChart3 size={20} className="text-sky-500/50" />
        </CardGlass>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <CardGlass className="p-4">
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2"><BarChart3 size={14} className="text-primary" /> Faturamento Anual ({anoAtual})</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kpis.porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="label" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={10} tickFormatter={(v) => `R$${v}`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [`R$ ${Number(value ?? 0)}`, 'Faturamento']} cursor={{fill: 'var(--border-subtle)'}} contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--color-foreground)' }} />
              <Bar dataKey="valor" fill="#d4af37" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardGlass>

        <CardGlass className="p-4">
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-primary" /> Top Serviços do Mês (Faturamento)</h4>
          {kpis.porServico.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={kpis.porServico} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} stroke="none" label={(d) => String(d.name).slice(0, 15)} labelLine={false} style={{fontSize: 10}}>
                  {kpis.porServico.map((_, i) => <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => [`R$ ${Number(value ?? 0)}`, '']} contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--color-foreground)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-[220px] flex items-center justify-center text-foreground/50 text-xs">Sem dados neste mês.</div>
          )}
        </CardGlass>
      </div>

      {/* Notificações WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Lembretes Pendentes (Manuais) */}
        <CardGlass className="lg:col-span-2 p-4 border-amber-500/20">
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-amber-500">
            <MessageSquare size={16} /> Disparos Manuais Pendentes (WhatsApp)
          </h4>
          {pendentesManuais.length === 0 ? (
            <div className="text-center py-6 text-foreground/40 text-sm">
              Todos os clientes pendentes já foram notificados!
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
              {pendentesManuais.map(a => (
                <div key={a.id} className="flex justify-between items-center p-3 rounded-lg bg-[var(--background)] border border-[var(--border-subtle)]">
                  <div>
                    <div className="font-bold text-sm text-foreground">{a.clienteNome}</div>
                    <div className="text-xs text-foreground/60">{a.hora_inicio} — {a.servicoNome}</div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs py-1.5 h-auto text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => handleDisparoManual(a.id)}>
                    Disparar Lembrete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardGlass>

        {/* Disparos Automáticos */}
        <CardGlass className="p-4 bg-emerald-500/5 border-emerald-500/20 flex flex-col justify-center items-center text-center">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-emerald-500">
            <CheckCircle2 size={16} /> Disparos Automáticos
          </h4>
          <p className="text-xs text-foreground/60 mb-4">
            Clientes já confirmados recebem alerta automático via Evolution API.
          </p>
          <div className="text-4xl font-black text-emerald-400 mb-1">{automáticos.length}</div>
          <div className="text-xs uppercase tracking-wider text-emerald-500/60 font-bold">Mensagens Enviadas</div>
        </CardGlass>
      </div>
    </div>
  );
}
