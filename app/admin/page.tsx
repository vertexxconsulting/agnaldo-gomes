'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';
import {
  Users, Wallet, BarChart3, TrendingUp, CalendarDays, CheckCircle2, XCircle, MessageSquare,
  GraduationCap, ShoppingBag, Sparkles, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { SectionHeader, Panel, StatCard } from '@/components/ui/Panel';
import { Button } from '@/components/Button';
import { fetchClientes, fetchAgendamentos, fetchServicos } from '@/lib/supabase-queries';
import type { Cliente, Agendamento, Servico } from '@/lib/gestao-types';

const getServicoNome = (id: string, servicos: Servico[]) => servicos.find(s => s.id === id)?.nome ?? 'Serviço excluído';
const getClienteNome = (id: string, clientes: Cliente[]) => clientes.find(c => c.id === id)?.nome ?? 'Cliente excluído';

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
        fetchClientes(),
        fetchAgendamentos(),
        fetchServicos(),
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
      const nome = getServicoNome(a.servico_id, servicosData);
      porServicoMap.set(nome, (porServicoMap.get(nome) ?? 0) + a.valor);
    });
    const porServico = [...porServicoMap.entries()].map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 6);

    return { hojeV, mesV, anoV, porMes, porServico, agendadosHoje: agendadosHoje.length, concluidosHoje, canceladosHoje, clientesCount: clientesData.length };
  }, [agendamentosData, clientesData, servicosData, hoje, mesAtual, anoAtual]);

  // Lógica para Notificações do WhatsApp (Simulação)
  const agendamentosDoDia = useMemo(() => agendamentosData.filter(a => a.data === hoje), [agendamentosData, hoje]);
  const automáticos = agendamentosDoDia.filter(a => a.status === 'confirmado');
  const [pendentesManuais, setPendentesManuais] = useState<any[]>([]);
  
  useEffect(() => {
    setPendentesManuais(
      agendamentosDoDia.filter(a => a.status === 'pendente').map(a => ({
        ...a,
        clienteNome: getClienteNome(a.cliente_id, clientesData),
        servicoNome: getServicoNome(a.servico_id, servicosData)
      }))
    );
  }, [agendamentosDoDia]);

  const handleDisparoManual = (id: string) => {
    alert("Mensagem enviada via WhatsApp!");
    setPendentesManuais(prev => prev.filter(a => a.id !== id));
  };

  const cards = [
    { label: 'Faturamento hoje', valor: `R$ ${kpis.hojeV}`, icon: Wallet, cor: '#d4af37' },
    { label: 'Faturamento do mês', valor: `R$ ${kpis.mesV}`, icon: TrendingUp, cor: '#10B981' },
    { label: 'Agendamentos (hoje)', valor: `${kpis.agendadosHoje}`, icon: CalendarDays, cor: '#0ea5e9' },
    { label: 'Clientes cadastrados', valor: `${kpis.clientesCount}`, icon: Users, cor: '#8b5cf6' },
  ];

  const ecossistema = [
    { href: '/hub', label: 'Command Center', desc: 'Gerencie tudo em um só lugar', icon: Sparkles, cor: 'primary' },
    { href: '/admin-academy', label: 'Academy', desc: 'Cursos e alunos', icon: GraduationCap, cor: 'purple' },
    { href: '/admin-loja', label: 'Loja', desc: 'Produtos e pedidos', icon: ShoppingBag, cor: 'green' },
  ];

  return (
    <div className="flex flex-col w-full space-y-7 py-2">
      {/* Banner do ecossistema — acesso rápido aos demais módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {ecossistema.map((e) => {
          const Icon = e.icon;
          const cores: Record<string, string> = {
            primary: 'from-[#a8862a]/15 to-[#a8862a]/5 hover:border-[#a8862a]/60',
            purple: 'from-[#8b5cf6]/15 to-[#8b5cf6]/5 hover:border-[#8b5cf6]/60',
            green: 'from-[#10B981]/15 to-[#10B981]/5 hover:border-[#10B981]/60',
          };
          const icoCores: Record<string, string> = { primary: 'text-primary', purple: 'text-[#8b5cf6]', green: 'text-[#10B981]' };
          return (
            <Link key={e.href} href={e.href}>
              <div className={`group rounded-xl border border-[var(--border-subtle)] bg-gradient-to-r ${cores[e.cor]} p-3 flex items-center gap-3 transition-all hover:shadow-md`}>
                <div className="w-9 h-9 rounded-lg bg-[var(--color-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                  <Icon size={17} className={icoCores[e.cor]} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate">{e.label}</p>
                  <p className="text-[11px] text-foreground/50">{e.desc}</p>
                </div>
                <ChevronRight size={15} className="ml-auto text-foreground/25 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
      <SectionHeader eyebrow="Visão geral do negócio" title="Dashboard" />

      {loading && (
        <div className="text-center py-8 text-foreground/50">Carregando dados do painel...</div>
      )}

      {/* Cards KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <StatCard key={i} label={c.label} value={c.valor} icon={Icon} tone={i === 0 ? 'primary' : 'default'} />
          );
        })}
      </div>

      {/* Status do dia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <StatCard tone="success" label="Concluídos hoje" value={kpis.concluidosHoje} icon={CheckCircle2} />
        <StatCard tone="danger" label="Cancelados / No-show" value={kpis.canceladosHoje} icon={XCircle} />
        <StatCard tone="primary" label="Ticket médio (mês)" value={
          kpis.mesV > 0 && agendamentosData.filter(a=>a.data.slice(0,7) === mesAtual && a.status === 'concluido').length > 0
            ? `R$ ${Math.round(kpis.mesV / agendamentosData.filter(a=>a.data.slice(0,7) === mesAtual && a.status === 'concluido').length)}`
            : 'R$ 0'
        } icon={BarChart3} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title={`Faturamento Anual (${anoAtual})`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={kpis.porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="label" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={10} tickFormatter={(v) => `R$${v}`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [`R$ ${Number(value ?? 0)}`, 'Faturamento']} cursor={{fill: 'var(--border-subtle)'}} contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--color-foreground)' }} />
              <Bar dataKey="valor" fill="#d4af37" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top Serviços do Mês (Faturamento)">
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
             <div className="h-[200px] flex items-center justify-center text-foreground/50 text-xs">Sem dados neste mês.</div>
          )}
        </Panel>
      </div>

      {/* Notificações WhatsApp - Ocultado conforme solicitado */}
      {/* 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel className="lg:col-span-2" title="Disparos Manuais Pendentes (WhatsApp)">
          ...
        </Panel>
        <Panel className="flex flex-col justify-center items-center text-center">
          ...
        </Panel>
      </div> 
      */}
    </div>
  );
}
