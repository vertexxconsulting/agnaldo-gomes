'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Scissors, GraduationCap, ShoppingBag,
  CalendarDays, Users, UserCircle, TrendingUp, Wallet,
  PlayCircle, Award, ChevronRight,
  BarChart3, Package, ArrowUpRight, ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { Panel, StatCard, SectionHeader } from '@/components/ui/Panel';
import { AdminSidebar, AdminShell } from '@/components/AdminSidebar';
import {
  getClientes, getAgendamentos, getServicos, getServicoNome, getClienteNome,
  getProfissionalNome, getCursos, getProgressoAluno, MOCK_PROFISSIONAIS,
} from '@/lib/mock-data';
import type { Cliente, Agendamento, Servico, Curso, Progresso } from '@/lib/mock-data';
import { supabase } from '@/lib/supabase';
import { ROLES, getHubModules, type HubModule } from '@/lib/auth';
import { StatusBadge } from '@/components/ui/Panel';
import { Command } from 'lucide-react';

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mesNome = (i: number) => meses[i] ?? `M${i + 1}`;
const CORES = ['#d4af37', '#c9a84c', '#b5952f', '#a8862a', '#d4af37', '#c9a84c'];

const MODULOS: Array<{ id: HubModule | string; nome: string; descricao: string; href: string; icon: typeof Scissors; stat: string }> = [
  {
    id: 'studio',
    nome: 'Studio de Beleza',
    descricao: 'Gestão completa do salão: agenda, clientes (CRM), profissionais e serviços.',
    href: '/admin',
    icon: Scissors,
    stat: 'Agendamentos e atendimento premium',
  },
  {
    id: 'academy',
    nome: 'Academy',
    descricao: 'Plataforma de cursos estilo streaming: aulas, módulos, certificados e comunidade.',
    href: '/admin-academy',
    icon: GraduationCap,
    stat: 'Cursos, alunos e certificados',
  },
  {
    id: 'loja',
    nome: 'Loja de Produtos',
    descricao: 'Catálogo, pedidos, estoque e pagamentos integrados ao Mercado Pago.',
    href: '/admin-loja',
    icon: ShoppingBag,
    stat: 'Vendas de produtos profissionais',
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
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } | null }) => {
      const meta = data?.user?.user_metadata;
      if (meta && typeof meta.role === 'string') setRole(meta.role);
      else setRole(null);
    });
  }, []);

  const modulosVisiveis = getHubModules(role ? { user_metadata: { role } } : null);
  const temModulo = (m: HubModule) => modulosVisiveis.includes(m);

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
    const concluidas = progresso.filter(p => p.concluida).length;
    const totalAulas = progresso.length;
    return { hojeV, mesV, porMes, agendadosHoje, concluidas, totalAulas, clientesCount: clientesData.length };
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

  const sidebarLinks = NAVEGACAO_RAPIDA.filter((item) => {
    if (item.href.startsWith('/admin-academy')) return temModulo('academy');
    if (item.href.startsWith('/admin-loja')) return temModulo('loja');
    return true;
  });

  return (
    <AdminShell
      sidebar={
        <AdminSidebar
          links={sidebarLinks}
          backLabel="Voltar ao Site Público"
          backHref="/"
          brand={{ icon: Command, text: 'Command Center' }}
        />
      }
    >
      <div className="space-y-7">
        {/* Boas-vindas */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-1.5">Agnaldo Gomes • Ecossistema Digital</p>
            <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">
              Olá, Agnaldo. Bem-vindo ao seu <span className="text-gradient">centro de comando</span>
            </h1>
            <p className="text-sm text-foreground/55 mt-1.5 max-w-2xl">
              {role === ROLES.STUDIO_SECRETARIA
                ? 'Painel da secretaria do Studio: agenda, clientes, profissionais e serviços do salão.'
                : 'Gerencie o Studio, a Academy e a Loja em um único lugar — com visão em tempo real de cada frente do negócio.'}
            </p>
          </div>
        </motion.div>

        {/* Módulos */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MODULOS.filter((mod) => modulosVisiveis.includes(mod.id as HubModule)).map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link href={mod.href}>
                  <div className="group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-br from-primary/8 to-primary/[0.03] hover:border-primary/50 p-5 h-full transition-all duration-300 hover:shadow-[0_8px_24px_rgba(168,134,42,0.12)] hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-card)] border border-[var(--border-subtle)] flex items-center justify-center shadow-sm">
                        <Icon size={18} className="text-primary" />
                      </div>
                      <ChevronRight size={16} className="text-foreground/25 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-base font-serif font-bold tracking-tight">{mod.nome}</h3>
                    <p className="text-xs text-foreground/55 mt-1 leading-relaxed">{mod.descricao}</p>
                    <p className="text-[9.5px] uppercase tracking-[0.14em] text-foreground/35 mt-2 font-semibold">{mod.stat}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </section>

        {/* KPIs em linha */}
        <section>
          <SectionHeader eyebrow="Indicadores consolidados" title="Visão Geral do Negócio" />
          {loading ? (
            <div className="text-center py-8 text-foreground/50 text-sm">Carregando visão geral...</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard label="Faturamento hoje" value={formatPrice(kpis.hojeV)} icon={Wallet} tone="primary" />
              <StatCard label="Faturamento do mês" value={formatPrice(kpis.mesV)} icon={TrendingUp} tone="success" />
              <StatCard label="Agendamentos hoje" value={`${kpis.agendadosHoje}`} icon={CalendarDays} />
              <StatCard label="Clientes cadastrados" value={`${kpis.clientesCount}`} icon={Users} />
              <StatCard label="Aulas concluídas" value={`${kpis.concluidas}/${kpis.totalAulas}`} icon={PlayCircle} tone="warning" />
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Agenda de hoje */}
          <section className="lg:col-span-2">
            <SectionHeader
              eyebrow="Próximos atendimentos no Studio"
              title="Agenda de Hoje"
              action={
                <Link href="/admin/agenda">
                  <span className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Ver agenda completa <ArrowUpRight size={12} /></span>
                </Link>
              }
            />
            {loading ? (
              <Panel className="py-10 text-center text-sm text-foreground/50">Carregando agenda...</Panel>
            ) : proximosAgendamentos.length === 0 ? (
              <Panel className="py-8 text-center text-sm text-foreground/50">
                Nenhum agendamento para hoje.{' '}
                <Link href="/admin/agenda" className="text-primary font-medium hover:underline">Organizar a semana</Link>
              </Panel>
            ) : (
              <div className="space-y-2">
                {proximosAgendamentos.map((a) => (
                  <Panel key={a.id} className="flex items-center gap-3 py-3 px-4">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCircle size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{a.cliente}</p>
                      <p className="text-[11px] text-foreground/45 truncate">{a.servico} • com {a.profissional}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-primary">{a.hora_inicio.slice(0, 5)}</p>
                      <StatusBadge status={a.status} />
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </section>

          {/* Progresso Academy */}
          {temModulo('academy') && (
            <section>
              <SectionHeader
                eyebrow="Seu progresso como aluno"
                title="Academy"
                action={
                  <Link href="/admin-academy">
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Admin <ArrowUpRight size={12} /></span>
                  </Link>
                }
              />
              <Panel className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold">Taxa de conclusão</p>
                    <p className="text-[10px] text-foreground/45">{kpis.concluidas} de {kpis.totalAulas} aulas</p>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${kpis.totalAulas ? Math.round((kpis.concluidas / kpis.totalAulas) * 100) : 0}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-[#a8862a] to-[#d4af37]"
                  />
                </div>
                <Link href="/aluno/dashboard">
                  <div className="flex items-center gap-2 text-[11px] text-primary font-semibold hover:underline mt-3">
                    <PlayCircle size={13} /> Continuar assistindo na Área do Aluno
                  </div>
                </Link>
              </Panel>

              <SectionHeader
                eyebrow=""
                title="Cursos ativos"
                className="mt-5"
                action={
                  <Link href="/admin-academy/cursos">
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Gerenciar <ArrowUpRight size={12} /></span>
                  </Link>
                }
              />
              <div className="space-y-2">
                {cursos.slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/admin-academy/cursos/${c.id}`}>
                    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-card)] p-3 hover:border-primary/50 hover:shadow-sm transition-all">
                      <div className="w-12 h-10 rounded-lg overflow-hidden relative shrink-0 bg-foreground/5">
                        <Image src={c.capaUrl} alt={c.titulo} fill className="object-cover" sizes="48px" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold truncate">{c.titulo}</p>
                        <p className="text-[10px] text-foreground/45">{c.duracaoHoras}h • {c.totalAulas} aulas • {c.nivel}</p>
                      </div>
                      <ChevronRight size={13} className="ml-auto text-foreground/25 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Faturamento mensal */}
        <section>
          <SectionHeader eyebrow="Acompanhe a evolução mês a mês" title="Faturamento do Salão" />
          {!loading && kpis.porMes.some(p => p.valor > 0) ? (
            <Panel className="mt-0">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={kpis.porMes}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--foreground)' }} opacity={0.65} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--foreground)' }} opacity={0.65} width={45} />
                  <Tooltip
                    formatter={(v) => [formatPrice(Number(v) || 0), 'Faturamento']}
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {kpis.porMes.map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          ) : (
            <Panel className="py-8 text-center text-sm text-foreground/50">
              Ainda não há faturamento registrado. Os valores aparecem aqui automaticamente quando agendamentos concluídos
              são marcados no módulo <Link href="/admin/agenda" className="text-primary font-medium hover:underline">Agenda</Link>.
            </Panel>
          )}
        </section>

        {/* Equipe */}
        <section>
          <SectionHeader
            eyebrow="Seus profissionais e especialidades"
            title="Equipe do Studio"
            action={
              <Link href="/admin/profissionais">
                <span className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Gerenciar equipe <ArrowUpRight size={12} /></span>
              </Link>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MOCK_PROFISSIONAIS.map((p) => (
              <Panel key={p.id} className="text-center py-4">
                <div className="w-14 h-14 rounded-full mx-auto mb-2.5 overflow-hidden relative bg-secondary">
                  {p.foto_url ? (
                    <Image src={p.foto_url} alt={p.nome} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircle size={28} className="text-primary/50" />
                    </div>
                  )}
                </div>
                <p className="text-[13px] font-semibold">{p.nome}</p>
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {(p.especialidades ?? []).slice(0, 3).map((e) => (
                    <span key={e} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{e}</span>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        </section>

        {/* CTA Loja */}
        {temModulo('loja') && (
          <section>
            <Link href="/admin-loja">
              <div className="group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-r from-primary/8 via-transparent to-primary/[0.05] px-5 py-4 flex flex-col sm:flex-row items-center gap-4 hover:border-primary/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                  <ShoppingBag size={18} className="text-primary" />
                </div>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <h3 className="text-sm font-serif font-bold">Loja de Produtos</h3>
                  <p className="text-xs text-foreground/50 mt-0.5 truncate sm:whitespace-normal">
                    Acompanhe pedidos, estoque e vendas de produtos profissionais e afiliados.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-primary group-hover:gap-2.5 transition-all shrink-0">
                  Abrir gestão da loja <ChevronRight size={14} />
                </div>
              </div>
            </Link>
          </section>
        )}

        <footer className="pt-6 pb-2 text-center">
          <p className="text-[10px] text-foreground/30">
            Desenvolvido por <span className="font-semibold text-foreground/40">Vertex Consulting</span> • Agnaldo Gomes — Studio, Academy &amp; Loja
          </p>
        </footer>
      </div>
    </AdminShell>
  );
}
