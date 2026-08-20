'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, GraduationCap, ShoppingBag, LayoutDashboard,
  CalendarDays, Users, UserCircle, TrendingUp, Wallet,
  PlayCircle, FileText, Award, ChevronRight, Sparkles,
  BarChart3, Clock, Star, CheckCircle2, PlusCircle, Package,
  ArrowUpRight, ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
} from 'recharts';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import {
  getClientes, getAgendamentos, getServicos, getServicoNome, getClienteNome,
  getProfissionalNome, getCursos, getProgressoAluno, MOCK_PROFISSIONAIS,
} from '@/lib/mock-data';
import type { Cliente, Agendamento, Servico, Curso, Progresso } from '@/lib/mock-data';

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mesNome = (i: number) => meses[i] ?? `M${i + 1}`;
const CORES = ['#d4af37', '#10B981', '#0ea5e9', '#EF4444', '#8b5cf6', '#f59e0b'];

// ─────────────────────────────────────────────
// Módulos do sistema (dados de exemplo)
// ─────────────────────────────────────────────
const MODULOS = [
  {
    id: 'salao',
    nome: 'Studio de Beleza',
    descricao: 'Gestão completa do salão: agenda, clientes (CRM), profissionais e serviços.',
    href: '/admin',
    icon: Scissors,
    bg: 'from-[#a8862a]/20 to-[#a8862a]/5',
    border: 'hover:border-[#a8862a]/60',
    stat: 'Gerencie agendamentos e o atendimento premium',
  },
  {
    id: 'academy',
    nome: 'Academy',
    descricao: 'Plataforma de cursos estilo streaming: aulas, módulos, certificados e comunidade.',
    href: '/admin-academy',
    icon: GraduationCap,
    bg: 'from-[#8b5cf6]/20 to-[#8b5cf6]/5',
    border: 'hover:border-[#8b5cf6]/60',
    stat: 'Cursos, alunos e certificados em um só lugar',
  },
  {
    id: 'loja',
    nome: 'Loja de Produtos',
    descricao: 'Catálogo, pedidos, estoque e pagamentos integrados ao Mercado Pago.',
    href: '/admin-loja',
    icon: ShoppingBag,
    bg: 'from-[#10B981]/20 to-[#10B981]/5',
    border: 'hover:border-[#10B981]/60',
    stat: 'Vendas de produtos profissionais e afiliados',
  },
];

const NAVEGACAO_RAPIDA = [
  { label: 'Agenda do dia', href: '/admin/agenda', icon: CalendarDays },
  { label: 'Clientes (CRM)', href: '/admin/clientes', icon: Users },
  { label: 'Profissionais', href: '/admin/profissionais', icon: UserCircle },
  { label: 'Serviços e preços', href: '/admin/servicos', icon: Scissors },
  { label: 'Gestão de Cursos', href: '/admin-academy/cursos', icon: PlayCircle },
  { label: 'Alunos & Certificados', href: '/admin-academy/alunos', icon: Award },
  { label: 'Pedidos da Loja', href: '/admin-loja/pedidos', icon: Package },
  { label: 'Produtos & Estoque', href: '/admin-loja/produtos', icon: ShoppingBag },
  { label: 'Área do Aluno', href: '/aluno/dashboard', icon: GraduationCap },
  { label: 'Catálogo da Loja', href: '/loja', icon: ExternalLink },
];

export default function HubCentralPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clientesData, setClientesData] = useState<Cliente[]>([]);
  const [agendamentosData, setAgendamentosData] = useState<Agendamento[]>([]);
  const [servicosData, setServicosData] = useState<Servico[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [progresso, setProgresso] = useState<Progresso[]>([]);

  useEffect(() => {
    (async () => {
      const [clientes, agendamentos, servicos, cursosData, progressoData] = await Promise.all([
        getClientes(), getAgendamentos(), getServicos(), getCursos(), getProgressoAluno(),
      ]);
      setClientesData(clientes);
      setAgendamentosData(agendamentos);
      setServicosData(servicos);
      setCursos(cursosData);
      setProgresso(progressoData);
      setLoading(false);
    })();
  }, []);

  const hoje = new Date().toISOString().split('T')[0];
  const mesAtual = hoje.slice(0, 7);
  const anoAtual = hoje.slice(0, 4);

  const kpis = useMemo(() => {
    const valorServico = (id: string) => servicosData.find(s => s.id === id)?.preco ?? 0;
    const concluidos = agendamentosData.filter(a => a.status === 'concluido');
    const faturamentos = concluidos.map(a => ({ ...a, valor: valorServico(a.servico_id) }));
    const hojeV = faturamentos.filter(a => a.data === hoje).reduce((s, a) => s + a.valor, 0);
    const mesV = faturamentos.filter(a => a.data.slice(0, 7) === mesAtual).reduce((s, a) => s + a.valor, 0);
    const porMes = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      const chave = `${anoAtual}-${m}`;
      const valor = faturamentos.filter(a => a.data.slice(0, 7) === chave).reduce((s, a) => s + a.valor, 0);
      return { label: mesNome(i), valor };
    });
    const agendadosHoje = agendamentosData.filter(a => a.data === hoje).length;
    const pendentes = agendamentosData.filter(a => a.data === hoje && a.status === 'pendente').length;
    // Progresso academy
    const concluidas = progresso.filter(p => p.concluida).length;
    const totalAulas = progresso.length;
    return { hojeV, mesV, porMes, agendadosHoje, pendentes, concluidas, totalAulas, clientesCount: clientesData.length };
  }, [agendamentosData, clientesData, servicosData, progresso, hoje, mesAtual, anoAtual]);

  const proximosAgendamentos = useMemo(() => {
    const hojeAg = agendamentosData.filter(a => a.data === hoje).slice(0, 5);
    return hojeAg.map(a => ({
      ...a,
      cliente: getClienteNome(a.cliente_id),
      profissional: getProfissionalNome(a.profissional_id),
      servico: getServicoNome(a.servico_id),
    }));
  }, [agendamentosData, hoje]);

  const formatPrice = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header do Hub */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--glass-bg)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 relative">
              <Image src="/logo-agnaldo.png" alt="Agnaldo Gomes" fill className="object-contain" sizes="36px" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-serif font-bold text-primary leading-none">Command Center</p>
              <p className="text-[10px] text-foreground/50 uppercase tracking-widest">Painel Unificado</p>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {NAVEGACAO_RAPIDA.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/5 whitespace-nowrap transition-colors">
                    <Icon size={13} className="shrink-0" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
          <Link href="/">
            <span className="flex items-center gap-1 text-[11px] text-foreground/50 hover:text-primary shrink-0">
              <ExternalLink size={12} /> Site Público
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* Boas-vindas */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-2">Agnaldo Gomes • Ecossistema Digital</p>
          <h1 className="text-3xl md:text-4xl font-serif font-bold">
            Olá, Agnaldo. Bem-vindo ao seu <span className="text-gradient">centro de comando</span>
          </h1>
          <p className="text-foreground/60 mt-2 max-w-2xl">
            Gerencie o Studio, a Academy e a Loja em um único lugar — com visão em tempo real do que acontece em cada frente do negócio.
          </p>
        </motion.div>

        {/* Cards dos Módulos */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MODULOS.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
              >
                <Link href={mod.href}>
                  <div className={`group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br ${mod.bg} ${mod.border} p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--color-card)] border border-[var(--border-subtle)] flex items-center justify-center shadow-sm">
                        <Icon size={22} className="text-primary" />
                      </div>
                      <ChevronRight size={20} className="text-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-lg font-serif font-bold mb-1">{mod.nome}</h3>
                    <p className="text-xs text-foreground/60 mb-3">{mod.descricao}</p>
                    <p className="text-[10px] uppercase tracking-widest text-foreground/40">{mod.stat}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </section>

        {/* KPIs gerais */}
        <section>
          <SectionTitle title="Visão Geral do Negócio" subtitle="Indicadores consolidados dos três módulos" align="left" size="sm" />
          {loading ? (
            <div className="text-center py-10 text-foreground/50">Carregando visão geral...</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
              {[
                { label: 'Faturamento hoje', valor: formatPrice(kpis.hojeV), icon: Wallet, cor: '#d4af37' },
                { label: 'Faturamento do mês', valor: formatPrice(kpis.mesV), icon: TrendingUp, cor: '#10B981' },
                { label: 'Agendamentos hoje', valor: `${kpis.agendadosHoje}`, icon: CalendarDays, cor: '#0ea5e9' },
                { label: 'Clientes cadastrados', valor: `${kpis.clientesCount}`, icon: Users, cor: '#8b5cf6' },
                { label: 'Aulas concluídas', valor: `${kpis.concluidas}/${kpis.totalAulas}`, icon: PlayCircle, cor: '#f59e0b' },
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <CardGlass key={i} className="flex flex-col gap-1 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={15} style={{ color: c.cor }} />
                      <span className="text-[10px] text-foreground/60 font-semibold uppercase tracking-wider">{c.label}</span>
                    </div>
                    <span className="text-xl font-bold">{c.valor}</span>
                  </CardGlass>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agenda de hoje */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle title="Agenda de Hoje" subtitle="Próximos atendimentos no Studio" align="left" size="sm" />
              <Link href="/admin/agenda">
                <span className="flex items-center gap-1 text-xs text-primary hover:underline">Ver agenda completa <ArrowUpRight size={12} /></span>
              </Link>
            </div>
            {loading ? (
              <div className="py-10 text-foreground/50 text-sm">Carregando agenda...</div>
            ) : proximosAgendamentos.length === 0 ? (
              <CardGlass className="p-8 text-center text-sm text-foreground/50">
                Nenhum agendamento para hoje.{' '}
                <Link href="/admin/agenda" className="text-primary font-medium hover:underline">Organizar a semana</Link>
              </CardGlass>
            ) : (
              <div className="space-y-2">
                {proximosAgendamentos.map((a) => (
                  <CardGlass key={a.id} className="flex items-center gap-4 p-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCircle size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{a.cliente}</p>
                      <p className="text-xs text-foreground/50 truncate">{a.servico} • com {a.profissional}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">{a.hora_inicio}</p>
                      <span className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${
                        a.status === 'confirmado' ? 'bg-success/15 text-success' :
                        a.status === 'concluido' ? 'bg-primary/15 text-primary' :
                        'bg-warning/15 text-warning'
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  </CardGlass>
                ))}
              </div>
            )}
          </section>

          {/* Progresso Academy + Cursos */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle title="Academy" subtitle="Seu progresso como aluno" align="left" size="sm" />
              <Link href="/admin-academy">
                <span className="flex items-center gap-1 text-xs text-primary hover:underline">Admin <ArrowUpRight size={12} /></span>
              </Link>
            </div>
            <CardGlass className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/15 flex items-center justify-center">
                  <GraduationCap size={18} className="text-[#8b5cf6]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Taxa de conclusão</p>
                  <p className="text-[11px] text-foreground/50">{kpis.concluidas} de {kpis.totalAulas} aulas</p>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${kpis.totalAulas ? Math.round((kpis.concluidas / kpis.totalAulas) * 100) : 0}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="h-full bg-gradient-to-r from-[#a8862a] to-[#d4af37]"
                />
              </div>
              <Link href="/aluno/dashboard">
                <div className="flex items-center gap-2 text-xs text-primary font-medium hover:underline">
                  <PlayCircle size={14} /> Continuar assistindo na Área do Aluno
                </div>
              </Link>
            </CardGlass>

            <div className="flex items-center justify-between mb-3 mt-6">
              <SectionTitle title="Cursos ativos" subtitle="" align="left" size="sm" />
              <Link href="/admin-academy/cursos">
                <span className="flex items-center gap-1 text-xs text-primary hover:underline">Gerenciar <ArrowUpRight size={12} /></span>
              </Link>
            </div>
            <div className="space-y-2">
              {cursos.slice(0, 3).map((c) => (
                <Link key={c.id} href={`/admin-academy/cursos/${c.id}`}>
                  <CardGlass className="flex items-center gap-3 p-3 hover:border-primary/50 transition-colors">
                    <div className="w-14 h-10 rounded-md overflow-hidden relative shrink-0 bg-foreground/5">
                      <Image src={c.capaUrl} alt={c.titulo} fill className="object-cover" sizes="56px" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{c.titulo}</p>
                      <p className="text-[10px] text-foreground/50">{c.duracaoHoras}h • {c.totalAulas} aulas • {c.nivel}</p>
                    </div>
                    <ChevronRight size={14} className="ml-auto text-foreground/30 shrink-0" />
                  </CardGlass>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Faturamento mensal */}
        <section>
          <SectionTitle title="Faturamento do Salão" subtitle="Acompanhe a evolução mês a mês" align="left" size="sm" />
          {!loading && kpis.porMes.some(p => p.valor > 0) ? (
            <CardGlass className="p-5 mt-4">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={kpis.porMes}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--foreground)' }} opacity={0.7} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--foreground)' }} opacity={0.7} width={45} />
                  <Tooltip
                    formatter={(v) => [formatPrice(Number(v) || 0), 'Faturamento']}
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {kpis.porMes.map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardGlass>
          ) : (
            <CardGlass className="p-6 mt-4 text-center text-sm text-foreground/50">
              Ainda não há faturamento registrado. Os valores aparecem aqui automaticamente quando agendamentos concluídos
              são marcados no módulo <Link href="/admin/agenda" className="text-primary font-medium hover:underline">Agenda</Link>.
            </CardGlass>
          )}
        </section>

        {/* Equipe */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle title="Equipe do Studio" subtitle="Seus profissionais e especialidades" align="left" size="sm" />
            <Link href="/admin/profissionais">
              <span className="flex items-center gap-1 text-xs text-primary hover:underline">Gerenciar equipe <ArrowUpRight size={12} /></span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MOCK_PROFISSIONAIS.map((p) => (
              <CardGlass key={p.id} className="p-4 text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden relative bg-secondary">
                  {p.foto_url ? (
                    <Image src={p.foto_url} alt={p.nome} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircle size={32} className="text-primary/50" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold">{p.nome}</p>
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {(p.especialidades ?? []).slice(0, 3).map((e) => (
                    <span key={e} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{e}</span>
                  ))}
                </div>
              </CardGlass>
            ))}
          </div>
        </section>

        {/* CTA Loja */}
        <section>
          <Link href="/admin-loja">
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-[#10B981]/15 via-transparent to-[#a8862a]/15 p-8 flex flex-col md:flex-row items-center gap-6 hover:border-[#10B981]/50 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-[var(--color-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                <ShoppingBag size={26} className="text-[#10B981]" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-serif font-bold">Loja de Produtos</h3>
                <p className="text-sm text-foreground/60 mt-1">
                  Acompanhe pedidos, estoque e vendas de produtos profissionais e afiliados — da vitrine ao pós-venda.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-[#10B981] group-hover:gap-3 transition-all">
                Abrir gestão da loja <ChevronRight size={16} />
              </div>
            </div>
          </Link>
        </section>

        <footer className="pt-8 pb-4 text-center">
          <p className="text-[10px] text-foreground/30">
            Desenvolvido por <span className="font-semibold text-foreground/40">Vertex Consulting</span> • Agnaldo Gomes — Studio, Academy & Loja
          </p>
        </footer>
      </main>
    </div>
  );
}
