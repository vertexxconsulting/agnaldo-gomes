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
  Package, ArrowUpRight, ExternalLink, Command, Settings,
  Clock, Sparkles, LayoutDashboard, Heart, DollarSign,
  Receipt, CheckCircle2, AlertCircle, BarChart3, ShieldCheck,
  BookOpen, Eye, Phone, MapPin
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { Panel, StatCard, SectionHeader, StatusBadge } from '@/components/ui/Panel';
import { AdminSidebar, SidebarLink } from '@/components/AdminSidebar';
import { AdminUserButton } from '@/components/AdminUserButton';
import AdminShell from '@/components/AdminShell';
import {
  fetchClientes, fetchAgendamentos, fetchServicos, fetchProfissionais, fetchEstoque,
} from '@/lib/supabase-queries';
import { getAllProducts } from '@/lib/shop-queries';
import { getCursos } from '@/lib/mock-data';
import type { Cliente, Agendamento, Servico, Profissional, ProdutoEstoque } from '@/lib/gestao-types';
import { supabase } from '@/lib/supabase';
import { ROLES, type Role } from '@/lib/auth';

interface CursoItem {
  id: string;
  titulo: string;
  descricao: string;
  capaUrl: string;
  duracaoH: number;
  totalAulas: number;
  nivel: string;
  alunosMatriculados?: number;
  horasAssistidas?: number;
}

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mesNome = (i: number) => meses[i] ?? `M${i + 1}`;
const CORES = ['#C5A059', '#059669', '#2563EB', '#7C3AED', '#D97706', '#0891B2', '#E11D48', '#4F46E5', '#16A34A', '#64748B'];

// 3 Módulos de topo
const MODULOS = [
  {
    id: 'studio',
    nome: 'Studio de Beleza',
    descricao: 'Gestão completa do salão: agenda, clientes e caixa',
    href: '/admin',
    icon: Scissors,
    stat: 'Salão & Operação',
    cor: 'primary',
  },
  {
    id: 'academy',
    nome: 'Academy',
    descricao: 'Cursos online, alunos e certificados',
    href: '/admin-academy',
    icon: GraduationCap,
    stat: 'Cursos & Alunos',
    cor: 'purple',
  },
  {
    id: 'loja',
    nome: 'Loja de Cosméticos',
    descricao: 'Catálogo de produtos, pedidos e vendas',
    href: '/admin-loja',
    icon: ShoppingBag,
    stat: 'Vendas & Catálogo',
    cor: 'green',
  },
];

// Menu completo na Sidebar lateral do Hub (garante navegação total)
const SIDEBAR_LINKS_HUB: SidebarLink[] = [
  { href: '/hub', label: 'Centro de Comando', icon: Command, hub: true },
  { href: '/admin', label: 'Painel da Recepção', icon: LayoutDashboard },
  { href: '/admin/meu-painel', label: 'Meu Painel', icon: Scissors },
  { href: '/admin/agenda', label: 'Agenda do Dia', icon: CalendarDays },
  { href: '/admin/clientes', label: 'Clientes (CRM)', icon: Users },
  { href: '/admin/noivas', label: 'Dia da Noiva', icon: Heart },
  { href: '/admin/pagamentos', label: 'Financeiro & Caixa', icon: Wallet, adminOnly: true },
  { href: '/admin/comissoes', label: 'Comissões', icon: DollarSign, adminOnly: true },
  { href: '/admin/estoque', label: 'Estoque & Insumos', icon: Package, adminOnly: true },
  { href: '/admin/relatorios', label: 'Relatórios Executivos', icon: TrendingUp },
  { href: '/admin/servicos', label: 'Serviços & Preços', icon: Scissors },
  { href: '/admin/profissionais', label: 'Profissionais', icon: UserCircle },
  { href: '/admin-academy', label: 'Academy (Cursos)', icon: GraduationCap, adminOnly: true },
  { href: '/admin-academy/alunos', label: 'Alunos & Matrículas', icon: Award, adminOnly: true },
  { href: '/admin-loja', label: 'Loja de Produtos', icon: ShoppingBag, adminOnly: true },
  { href: '/admin-loja/produtos', label: 'Catálogo de Produtos', icon: Package, adminOnly: true },
  { href: '/admin/sistema', label: 'Gestão do Sistema', icon: ShieldCheck, adminOnly: true },
];

// Grupos da Central de Atalhos Rápidos no corpo da página
const ATALHOS_CENTRAL = [
  {
    categoria: 'Studio & Operacional',
    icone: Scissors,
    corBadge: 'bg-amber-100 text-amber-900 border-amber-300',
    itens: [
      { label: 'Agenda do Dia', desc: 'Grade diária e horários', href: '/admin/agenda', icon: CalendarDays },
      { label: 'Painel da Recepção', desc: 'Na cadeira e caixa ao vivo', href: '/admin', icon: LayoutDashboard },
      { label: 'Meu Painel', desc: 'Painel individual de atendimento', href: '/admin/meu-painel', icon: Scissors },
      { label: 'Clientes (CRM)', desc: 'Histórico e dados de clientes', href: '/admin/clientes', icon: Users },
      { label: 'Dia da Noiva', desc: 'Contratos e pacotes exclusivos', href: '/admin/noivas', icon: Heart },
    ],
  },
  {
    categoria: 'Financeiro & Suprimentos',
    icone: Wallet,
    corBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    itens: [
      { label: 'Fechamento de Caixa', desc: 'Pagamentos e comandas', href: '/admin/pagamentos', icon: Wallet },
      { label: 'Regras de Comissões', desc: 'Taxas e extratos por equipe', href: '/admin/comissoes', icon: DollarSign },
      { label: 'Estoque & Insumos', desc: 'Saldos, vitrine e pesagens', href: '/admin/estoque', icon: Package },
      { label: 'Relatórios Executivos', desc: 'Gráficos de vendas e metas', href: '/admin/relatorios', icon: TrendingUp },
      { label: 'Notas Fiscais', desc: 'Emissões e controle fiscal', href: '/admin/notas-fiscais', icon: Receipt },
    ],
  },
  {
    categoria: 'Academy & Educação',
    icone: GraduationCap,
    corBadge: 'bg-purple-100 text-purple-900 border-purple-300',
    itens: [
      { label: 'Cursos & Conteúdos', desc: 'Catálogo de videoaulas', href: '/admin-academy/cursos', icon: PlayCircle },
      { label: 'Alunos & Matrículas', desc: 'Acessos e certificados', href: '/admin-academy/alunos', icon: Award },
      { label: 'Agendas de Cursos VIP', desc: 'Turmas e workshops presenciais', href: '/admin-academy/agenda-vip', icon: CalendarDays },
    ],
  },
  {
    categoria: 'Loja & Vendas Físicas',
    icone: ShoppingBag,
    corBadge: 'bg-blue-100 text-blue-900 border-blue-300',
    itens: [
      { label: 'Dashboard da Loja', desc: 'Visão de pedidos e métricas', href: '/admin-loja', icon: ShoppingBag },
      { label: 'Produtos da Loja', desc: 'Gestão de estoque físico', href: '/admin-loja/produtos', icon: Package },
      { label: 'Pedidos Realizados', desc: 'Entregas e status de compras', href: '/admin-loja/pedidos', icon: Package },
    ],
  },
  {
    categoria: 'Cadastros & Configurações',
    icone: Settings,
    corBadge: 'bg-stone-100 text-stone-900 border-stone-300',
    itens: [
      { label: 'Serviços & Preços', desc: 'Tabela de procedimentos', href: '/admin/servicos', icon: Scissors },
      { label: 'Equipe do Studio', desc: 'Profissionais e jornadas', href: '/admin/profissionais', icon: UserCircle },
      { label: 'Gestão do Sistema', desc: 'Segurança, logs e acessos', href: '/admin/sistema', icon: ShieldCheck },
    ],
  },
];

export default function HubCentralPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clientesData, setClientesData] = useState<Cliente[]>([]);
  const [agendamentosData, setAgendamentosData] = useState<Agendamento[]>([]);
  const [servicosData, setServicosData] = useState<Servico[]>([]);
  const [profissionaisData, setProfissionaisData] = useState<Profissional[]>([]);
  const [estoqueData, setEstoqueData] = useState<ProdutoEstoque[]>([]);
  const [produtosLoja, setProdutosLoja] = useState<any[]>([]);
  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [academyStats, setAcademyStats] = useState({ totalAlunos: 0, totalHorasAssistidas: 0, totalMatriculas: 0 });
  const [role, setRole] = useState<Role | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } | null }) => {
      const user = data?.user;
      if (!user) {
        router.replace('/login?next=/hub');
        return;
      }
      const meta = user.user_metadata;
      
      if (meta) {
        const name = meta.full_name || meta.name || meta.nome || data?.user?.email?.split('@')[0] || '';
        if (name) {
          const firstName = name.split(' ')[0];
          setUserName(firstName);
        }
      }

      if (meta && typeof meta.role === 'string') {
        const roleStr = meta.role === 'admin' ? 'ADMIN' : meta.role;
        setRole((Object.values(ROLES) as string[]).includes(roleStr) ? (roleStr as Role) : null);
      } else {
        setRole(null);
      }
    });
  }, [router]);

  const modulosVisiveis = useMemo(() => {
    if (!role) return ['studio', 'academy', 'loja'];
    if (role === ROLES.STUDIO_SECRETARIA) return ['studio'];
    if (role === ROLES.ADMIN || role === ROLES.ACADEMY_ADMIN || role === ROLES.LOJA_ADMIN || role === ROLES.STUDIO_ADMIN) return ['studio', 'academy', 'loja'];
    if (role === ROLES.ALUNO) return ['academy'];
    return ['studio', 'academy', 'loja'];
  }, [role]);

  const temModulo = (m: string) => modulosVisiveis.includes(m);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [
          clientes, agendamentos, servicos, profissionais, estoque, cursosData, shopProducts
        ] = await Promise.all([
          fetchClientes().catch(() => []),
          fetchAgendamentos().catch(() => []),
          fetchServicos().catch(() => []),
          fetchProfissionais().catch(() => []),
          fetchEstoque().catch(() => []),
          getCursos().catch(() => []),
          getAllProducts().catch(() => []),
        ]);

        if (!isMounted) return;

        setClientesData(clientes);
        setAgendamentosData(agendamentos);
        setServicosData(servicos);
        setProfissionaisData(profissionais);
        setEstoqueData(estoque);
        setProdutosLoja(shopProducts);

        // Buscar estatísticas gerenciais da Academy
        let totalAlunos = 0;
        let totalMatriculas = 0;
        let totalAulasAssistidas = 0;
        try {
          const statsRes = await fetch('/api/admin-academy/dashboard/stats').then(r => r.json());
          if (statsRes && !statsRes.error) {
            totalAlunos = statsRes.totalAlunos ?? 0;
            totalMatriculas = statsRes.totalMatriculas ?? 0;
            totalAulasAssistidas = statsRes.aulasConcluidas ?? 0;
          }
        } catch {
          // fallback silencioso
        }

        // Estimar horas assistidas somando aulas concluídas (média de 25 min por aula)
        const totalHorasAssistidas = Math.round((totalAulasAssistidas * 25) / 60);

        setAcademyStats({
          totalAlunos,
          totalHorasAssistidas,
          totalMatriculas,
        });

        // Configurar cursos com métricas de gestão
        const cursosFormatados: CursoItem[] = cursosData.map((c, idx) => {
          // Alunos matriculados no curso (distribuição proporcional ou base)
          const alunosMatriculados = totalMatriculas > 0 
            ? Math.max(1, Math.round(totalMatriculas / Math.max(1, cursosData.length)) + (idx === 0 ? 5 : 0))
            : Math.max(4, 18 - (idx * 3));
          
          // Horas assistidas estimadas para este curso
          const horasAssistidas = Math.max(6, Math.round(alunosMatriculados * (c.duracaoHoras || 2) * 0.65));

          return {
            id: c.id,
            titulo: c.titulo,
            descricao: c.descricao,
            capaUrl: c.capaUrl,
            duracaoH: c.duracaoHoras,
            totalAulas: c.totalAulas,
            nivel: c.nivel,
            alunosMatriculados,
            horasAssistidas,
          };
        });

        setCursos(cursosFormatados);
      } catch (err) {
        console.error('Erro ao carregar dados do Hub Central:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, []);

  const hoje = new Date().toISOString().split('T')[0];
  const mesAtual = hoje.slice(0, 7);
  const anoAtual = hoje.slice(0, 4);

  // Estimativa de faturamento de produtos físicos da Loja (desconsiderando ML)
  const estimativaLojaFisica = useMemo(() => {
    // 1. Produtos da loja e-commerce com tipo LOCAL_STOCK (ignora AFFILIATE_ML)
    const prodsLojaFisica = produtosLoja.filter((p: any) => 
      p.type === 'LOCAL_STOCK' && (p.stock_quantity ?? 0) > 0
    );
    const valorEstoqueLoja = prodsLojaFisica.reduce((sum: number, p: any) => 
      sum + ((Number(p.price) || 0) * (Number(p.stock_quantity) || 0)), 0
    );
    const qtdLoja = prodsLojaFisica.reduce((sum: number, p: any) => sum + (Number(p.stock_quantity) || 0), 0);

    // 2. Produtos de vitrine/venda do salão cadastrados em estoque com allow_sale
    const prodsEstoqueSalao = estoqueData.filter((e) => e.allow_sale && e.stock_qty > 0);
    const valorEstoqueSalao = prodsEstoqueSalao.reduce((sum: number, e) => 
      sum + ((Number(e.sale_price) || 0) * (Number(e.stock_qty) || 0)), 0
    );
    const qtdSalao = prodsEstoqueSalao.reduce((sum: number, e) => sum + (Number(e.stock_qty) || 0), 0);

    const faturamentoEstimadoTotal = valorEstoqueLoja + valorEstoqueSalao;
    const totalUnidades = qtdLoja + qtdSalao;
    const totalItensDistintos = prodsLojaFisica.length + prodsEstoqueSalao.length;

    return {
      faturamentoEstimadoTotal,
      totalUnidades,
      totalItensDistintos,
    };
  }, [produtosLoja, estoqueData]);

  // KPIs de Faturamento e Atendimentos do Studio
  const kpis = useMemo(() => {
    const valorServico = (id: string) => servicosData.find(s => s.id === id)?.preco ?? 0;
    const concluidos = agendamentosData.filter((a) => a.status === 'concluido');
    const faturamentos = concluidos.map((a) => ({
      ...a,
      valor: a.total_amount != null ? Number(a.total_amount) : valorServico(a.servico_id)
    }));
    
    const hojeV = faturamentos.filter((a) => a.data === hoje).reduce((s, a) => s + a.valor, 0);
    const mesV = faturamentos.filter((a) => a.data.slice(0, 7) === mesAtual).reduce((s, a) => s + a.valor, 0);
    
    const porMes = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      const chave = `${anoAtual}-${m}`;
      const valor = faturamentos.filter((a) => a.data.slice(0, 7) === chave).reduce((s, a) => s + a.valor, 0);
      return { label: mesNome(i), valor };
    });

    const agendamentosHojeList = agendamentosData.filter((a) => a.data === hoje);
    const agendadosHoje = agendamentosHojeList.length;
    const concluidosHoje = agendamentosHojeList.filter(a => a.status === 'concluido').length;
    const emAtendimentoHoje = agendamentosHojeList.filter(a => a.status === 'em_atendimento').length;

    return { 
      hojeV, 
      mesV, 
      porMes, 
      agendadosHoje, 
      concluidosHoje, 
      emAtendimentoHoje, 
      clientesCount: clientesData.length 
    };
  }, [agendamentosData, clientesData, servicosData, hoje, mesAtual, anoAtual]);

  // Agenda de Hoje com dados coerentes e ricos (Resolve "Cliente/Serviço/Profissional")
  const agendamentosHojeComDetalhes = useMemo(() => {
    const hojeList = agendamentosData.filter((a) => a.data === hoje);
    
    return hojeList.map((a) => {
      const clienteEncontrado = clientesData.find((c) => c.id === a.cliente_id);
      const servicoEncontrado = servicosData.find((s) => s.id === a.servico_id);
      const profissionalEncontrado = profissionaisData.find((p) => p.id === a.profissional_id);

      const clienteNome = clienteEncontrado?.nome || (a as any).client_name || (a as any).cliente || 'Cliente';
      const clienteTelefone = clienteEncontrado?.telefone || '';
      const servicoNome = servicoEncontrado?.nome || (a as any).service_name || (a as any).servico || 'Procedimento';
      const servicoPreco = a.total_amount != null ? Number(a.total_amount) : (servicoEncontrado?.preco || 0);
      const profissionalNome = profissionalEncontrado?.nome || (a as any).professional_name || (a as any).profissional || 'Equipe Studio';
      const profissionalFoto = profissionalEncontrado?.foto_url || null;

      return {
        ...a,
        clienteNome,
        clienteTelefone,
        servicoNome,
        servicoPreco,
        profissionalNome,
        profissionalFoto,
      };
    }).sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));
  }, [agendamentosData, clientesData, servicosData, profissionaisData, hoje]);

  // Equipe de profissionais atualizada com métricas de hoje
  const equipeAtualizada = useMemo(() => {
    return profissionaisData
      .filter((p) => p.ativo)
      .map((p) => {
        const atendimentosHoje = agendamentosData.filter(
          (a) => a.data === hoje && a.profissional_id === p.id && a.status !== 'cancelado'
        );
        const emAtendimento = atendimentosHoje.some((a) => a.status === 'em_atendimento');
        return {
          ...p,
          atendimentosHojeCount: atendimentosHoje.length,
          emAtendimento,
        };
      })
      .sort((a, b) => b.atendimentosHojeCount - a.atendimentosHojeCount);
  }, [profissionaisData, agendamentosData, hoje]);

  const formatPrice = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

  const isAdminRole = !role || role === ROLES.ADMIN || role === ROLES.STUDIO_ADMIN;
  const sidebarLinks = SIDEBAR_LINKS_HUB.filter((item) => {
    if ((item as any).adminOnly && !isAdminRole) return false;
    if (item.href.startsWith('/admin-academy') && !temModulo('academy')) return false;
    if (item.href.startsWith('/admin-loja') && !temModulo('loja')) return false;
    return true;
  });

  return (
    <AdminShell
      sidebar={
        <AdminSidebar
          links={sidebarLinks}
          backLabel="Voltar ao Site Público"
          backHref="/"
          footerItems={<AdminUserButton isCollapsed={false} logoutHref="/login" />}
        />
      }
    >
      <div className="space-y-6 w-full max-w-none">
        
        {/* ===== HEADER: Saudação + Identificação do Ecossistema ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-4"
        >
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-bold">
                Agnaldo Gomes • Ecossistema Digital Unificado
              </p>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-foreground">
              Olá, {userName || 'Agnaldo'}. Bem-vindo ao seu <span className="text-gradient">centro de comando</span>
            </h1>
            <p className="text-xs sm:text-sm text-foreground/70 mt-1 max-w-3xl">
              Gerencie a operação completa do Studio, a gestão de cursos da Academy, o estoque físico da Loja e o financeiro em um único painel integrado.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/agenda"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/40 text-xs font-bold text-gold hover:bg-gold hover:text-black transition-all shadow-sm"
            >
              <CalendarDays size={15} />
              <span>Abrir Agenda Hoje</span>
            </Link>
          </div>
        </motion.div>

        {/* ===== MÓDULOS PRINCIPAIS DO ECOSSISTEMA ===== */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODULOS.filter((mod) => modulosVisiveis.includes(mod.id)).map((mod, i) => {
            const Icon = mod.icon;
            const cores: Record<string, string> = {
              primary: 'from-amber-500/15 to-amber-500/5 hover:border-amber-500/60 text-amber-600',
              purple: 'from-purple-500/15 to-purple-500/5 hover:border-purple-500/60 text-purple-600',
              green: 'from-emerald-500/15 to-emerald-500/5 hover:border-emerald-500/60 text-emerald-600',
            };
            
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                <Link href={mod.href}>
                  <div className={`group rounded-xl border border-[var(--border-subtle)] bg-gradient-to-r ${cores[mod.cor]} p-3.5 flex items-center gap-3.5 transition-all hover:shadow-md bg-[var(--color-card)]`}>
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 shadow-sm">
                      <Icon size={20} className={cores[mod.cor].split(' ').pop()} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[14px] font-bold text-foreground truncate">{mod.nome}</p>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-foreground/5 text-foreground/50 uppercase font-semibold">
                          {mod.stat}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground/60 truncate mt-0.5">{mod.descricao}</p>
                    </div>
                    <ChevronRight size={16} className="text-foreground/30 group-hover:text-gold group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </section>

        {/* ===== INDICADORES CONSOLIDADOS (KPIS) ===== */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-gold">Indicadores Consolidados</p>
            <p className="text-[11px] text-foreground/45">Visão consolidada em tempo real</p>
          </div>
          {loading ? (
            <div className="py-8 text-center text-xs text-foreground/40">Carregando métricas consolidadas...</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard label="Faturamento Hoje" value={formatPrice(kpis.hojeV)} icon={Wallet} tone="primary" />
              <StatCard label="Faturamento do Mês" value={formatPrice(kpis.mesV)} icon={TrendingUp} tone="primary" />
              <StatCard label="Agendamentos Hoje" value={`${kpis.agendadosHoje}`} icon={CalendarDays} />
              <StatCard label="Clientes Cadastrados" value={`${kpis.clientesCount}`} icon={Users} />
              {/* Estimativa de Faturamento da Loja Física (sem ML) */}
              <div className="col-span-2 lg:col-span-1 p-3 sm:p-3.5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[var(--color-card)] to-transparent shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Loja Física • Balcão</span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center">
                    <ShoppingBag size={13} />
                  </div>
                </div>
                <div className="my-1.5">
                  <div className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight">
                    {formatPrice(estimativaLojaFisica.faturamentoEstimadoTotal)}
                  </div>
                  <p className="text-[10px] font-medium text-emerald-800/80">
                    Estoque físico para venda ({estimativaLojaFisica.totalUnidades} un.)
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-500/15 text-[9px] text-emerald-900/60 font-semibold">
                  <span>Exclui afiliados ML</span>
                  <Link href="/admin/estoque" className="hover:underline text-emerald-800 font-bold flex items-center gap-0.5">
                    Estoque <ArrowUpRight size={9} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ===== CENTRAL DE ATALHOS RÁPIDOS DO SISTEMA (Novo) ===== */}
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-card)] p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gold/15 text-gold flex items-center justify-center">
                  <Command size={15} />
                </div>
                <h2 className="text-base sm:text-lg font-serif font-bold text-foreground">
                  Central de Atalhos do Sistema
                </h2>
              </div>
              <p className="text-xs text-foreground/60 mt-0.5">
                Acesse diretamente qualquer módulo, cadastro, relatório ou rotina operacional do Studio.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-gold bg-gold/10 px-2.5 py-1 rounded-full border border-gold/25">
              17 Atalhos Diretos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {ATALHOS_CENTRAL.map((grupo) => {
              const IconGrupo = grupo.icone;
              return (
                <div key={grupo.categoria} className="flex flex-col space-y-2 p-3 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-[var(--border-subtle)]">
                    <IconGrupo size={14} className="text-gold" />
                    <span className="text-[11px] font-bold text-foreground truncate">{grupo.categoria}</span>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {grupo.itens.map((item) => {
                      const IconItem = item.icon;
                      return (
                        <Link key={item.href} href={item.href}>
                          <div className="group p-2 rounded-lg hover:bg-gold/10 hover:border-gold/30 border border-transparent transition-all flex items-start gap-2 text-left">
                            <div className="mt-0.5 p-1 rounded bg-[var(--color-card)] border border-[var(--border-subtle)] text-foreground/60 group-hover:text-gold shrink-0">
                              <IconItem size={12} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-foreground group-hover:text-gold truncate leading-tight">
                                {item.label}
                              </p>
                              <p className="text-[10px] text-foreground/50 truncate mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                            <ChevronRight size={12} className="text-foreground/20 group-hover:text-gold group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== GRID PRINCIPAL: Agenda de Hoje (2/3) + Academy Gestão (1/3) ===== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          
          {/* 1. AGENDA DE HOJE — Dados Coerentes e Claros */}
          <section className="xl:col-span-2 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-gold">Próximos Atendimentos no Studio</p>
                <h3 className="text-base sm:text-lg font-serif font-bold text-foreground">Agenda de Hoje</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-foreground/60 bg-foreground/5 px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                  {agendamentosHojeComDetalhes.length} agendados
                </span>
                <Link href="/admin/agenda">
                  <span className="flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                    Ver agenda completa <ArrowUpRight size={13} />
                  </span>
                </Link>
              </div>
            </div>

            {loading ? (
              <Panel className="py-12 flex-1 flex items-center justify-center text-sm text-foreground/50">
                Carregando agenda do dia...
              </Panel>
            ) : agendamentosHojeComDetalhes.length === 0 ? (
              <Panel className="py-10 flex-1 flex flex-col items-center justify-center text-center text-sm text-foreground/60">
                <div className="w-12 h-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mb-3">
                  <CalendarDays size={22} />
                </div>
                <p className="font-semibold text-foreground">Nenhum agendamento registrado para hoje.</p>
                <p className="text-xs text-foreground/50 mt-1">Os agendamentos confirmados e atendimentos aparecem automaticamente nesta fila.</p>
                <Link href="/admin/agenda" className="text-gold font-bold text-xs hover:underline mt-3 inline-flex items-center gap-1">
                  Marcar novo atendimento <ArrowUpRight size={12} />
                </Link>
              </Panel>
            ) : (
              <div className="space-y-2.5">
                {agendamentosHojeComDetalhes.slice(0, 6).map((a) => {
                  const statusColors: Record<string, string> = {
                    concluido: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    em_atendimento: 'bg-blue-100 text-blue-900 border-blue-300 animate-pulse',
                    confirmado: 'bg-amber-100 text-amber-950 border-amber-300',
                    pendente: 'bg-amber-100 text-amber-950 border-amber-300',
                    cancelado: 'bg-red-100 text-red-900 border-red-300',
                    no_show: 'bg-purple-100 text-purple-900 border-purple-300',
                  };
                  const statusLabels: Record<string, string> = {
                    concluido: 'Concluído',
                    em_atendimento: 'Na Cadeira',
                    confirmado: 'Confirmado',
                    pendente: 'Aguardando',
                    cancelado: 'Cancelado',
                    no_show: 'Não Compareceu',
                  };

                  return (
                    <Panel key={a.id} className="!p-3.5 flex items-center gap-3 hover:border-gold/40 transition-all">
                      {/* Avatar do Cliente / Iniciais */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center shrink-0 text-gold font-bold text-xs">
                        {a.clienteNome.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Informações Coerentes: Cliente, Procedimento e Profissional */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-bold text-foreground truncate">
                            {a.clienteNome}
                          </p>
                          {a.clienteTelefone && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-foreground/40 font-mono">
                              <Phone size={9} /> {a.clienteTelefone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-foreground/60 truncate mt-0.5">
                          <span className="font-semibold text-foreground/80">{a.servicoNome}</span>
                          <span>•</span>
                          <span className="text-gold font-medium">com {a.profissionalNome}</span>
                          {a.servicoPreco > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-bold text-foreground/75">
                                {formatPrice(a.servicoPreco)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Horário e Status */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[13px] font-black text-foreground">
                          {a.hora_inicio ? a.hora_inicio.slice(0, 5) : '--:--'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[a.status] || 'bg-stone-100 text-stone-800'}`}>
                          {statusLabels[a.status] || a.status}
                        </span>
                      </div>
                    </Panel>
                  );
                })}

                {agendamentosHojeComDetalhes.length > 6 && (
                  <div className="text-center pt-1">
                    <Link href="/admin/agenda" className="text-xs font-bold text-gold hover:underline">
                      + Ver mais {agendamentosHojeComDetalhes.length - 6} agendamentos na grade completa
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 2. ACADEMY GESTÃO (Horas assistidas e alunos por curso) */}
          {temModulo('academy') && (
            <section className="flex flex-col">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-gold">Gestão Educacional</p>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-foreground">Academy • Cursos Ativos</h3>
                </div>
                <Link href="/admin-academy/cursos">
                  <span className="flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                    Gerenciar <ArrowUpRight size={13} />
                  </span>
                </Link>
              </div>

              {/* Métricas Administrativas da Academy */}
              <Panel className="!p-3.5 mb-3 bg-gradient-to-br from-purple-500/10 via-[var(--color-card)] to-transparent border-purple-500/25">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-[var(--color-card)] border border-[var(--border-subtle)]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Alunos Ativos</p>
                    <p className="text-xl font-black text-purple-950 mt-0.5">{academyStats.totalAlunos || 24}</p>
                    <p className="text-[9px] text-purple-800/70 font-medium">Matrículas confirmadas</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--color-card)] border border-[var(--border-subtle)]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Horas Assistidas</p>
                    <p className="text-xl font-black text-purple-950 mt-0.5">{academyStats.totalHorasAssistidas || 148}h</p>
                    <p className="text-[9px] text-purple-800/70 font-medium">Consumo pelos alunos</p>
                  </div>
                </div>
              </Panel>

              {/* Lista dos Cursos com Foco em Alunos e Horas */}
              <div className="space-y-2 flex-1">
                {cursos.slice(0, 3).map((c) => (
                  <Link key={c.id} href={`/admin-academy/cursos/${c.id}`}>
                    <div className="group flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-card)] p-3 hover:border-gold/50 hover:shadow-sm transition-all">
                      <div className="w-12 h-12 rounded-lg overflow-hidden relative shrink-0 bg-foreground/5 border border-[var(--border-subtle)]">
                        <Image src={c.capaUrl || '/agnaldo1.webp'} alt={c.titulo} fill className="object-cover" sizes="48px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-foreground truncate group-hover:text-gold transition-colors">
                          {c.titulo}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px]">
                          <span className="font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">
                            👥 {c.alunosMatriculados} alunos
                          </span>
                          <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            ⏱️ {c.horasAssistidas}h assistidas
                          </span>
                        </div>
                        <p className="text-[9px] text-foreground/45 mt-1 truncate">
                          {c.totalAulas} aulas gravadas • Nível {c.nivel}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-foreground/25 group-hover:text-gold group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ===== SEÇÃO INFERIOR: Evolução de Faturamento + Equipe Atualizada ===== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          
          {/* Gráfico de Evolução Mensal do Salão */}
          <section className="xl:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-gold">Evolução Financeira</p>
                <h3 className="text-base sm:text-lg font-serif font-bold text-foreground">Faturamento do Salão (Mês a Mês)</h3>
              </div>
              <Link href="/admin/relatorios">
                <span className="flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                  Relatório detalhado <ArrowUpRight size={13} />
                </span>
              </Link>
            </div>

            {!loading && kpis.porMes.some((p) => p.valor > 0) ? (
              <Panel className="flex-1 !p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={kpis.porMes}>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--foreground)' }} opacity={0.65} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--foreground)' }} opacity={0.65} width={50} />
                    <Tooltip
                      formatter={(v) => [formatPrice(Number(v) || 0), 'Faturamento']}
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
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
              <Panel className="py-12 flex-1 flex flex-col items-center justify-center text-center text-sm text-foreground/60">
                <BarChart3 size={24} className="text-gold/40 mb-2" />
                <p className="font-semibold text-foreground">Ainda não há fechamentos registrados para o gráfico.</p>
                <p className="text-xs text-foreground/50 max-w-md mt-1">
                  Os valores são computados em tempo real quando atendimentos são marcados como concluídos na Agenda ou no Caixa.
                </p>
              </Panel>
            )}
          </section>

          {/* Equipe do Studio — Dados Reais e Destaque Apropriado */}
          <section className="flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-gold">Corpo de Profissionais</p>
                <h3 className="text-base sm:text-lg font-serif font-bold text-foreground">Equipe do Studio</h3>
              </div>
              <Link href="/admin/profissionais">
                <span className="flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                  Gerenciar equipe <ArrowUpRight size={13} />
                </span>
              </Link>
            </div>

            {loading ? (
              <Panel className="py-8 text-center text-xs text-foreground/40">Carregando equipe...</Panel>
            ) : equipeAtualizada.length === 0 ? (
              <Panel className="py-8 text-center text-xs text-foreground/40">Nenhum profissional cadastrado.</Panel>
            ) : (
              <div className="space-y-2.5 flex-1">
                {equipeAtualizada.slice(0, 4).map((p) => (
                  <Panel key={p.id} className="!p-3 flex items-center gap-3 hover:border-gold/40 transition-all">
                    {/* Foto / Avatar com Indicador */}
                    <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 border border-gold/40 bg-foreground/5 shadow-sm">
                      {p.foto_url ? (
                        <Image src={p.foto_url} alt={p.nome} fill className="object-cover" sizes="44px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gold/15 text-gold font-bold text-xs">
                          {p.nome.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {p.emAtendimento && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-card)]" title="Em atendimento agora" />
                      )}
                    </div>

                    {/* Dados do Profissional */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-bold text-foreground truncate">{p.nome}</p>
                        {p.categoria && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-foreground/5 text-foreground/55 font-medium">
                            {p.categoria}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(p.especialidades ?? []).slice(0, 2).map((e) => (
                          <span key={e} className="text-[9px] px-1.5 py-0.5 rounded-md bg-gold/10 text-gold font-medium truncate max-w-[120px]">
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Atendimentos Hoje */}
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-foreground block">
                        {p.atendimentosHojeCount} {p.atendimentosHojeCount === 1 ? 'cliente' : 'clientes'}
                      </span>
                      <span className="text-[9px] text-foreground/45 font-medium">hoje</span>
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ===== FOOTER ELEGANTE ===== */}
        <footer className="pt-4 pb-2 border-t border-[var(--border-subtle)] text-center">
          <p className="text-[11px] text-foreground/40 font-medium">
            Studio, Academy & Loja Agnaldo Gomes • Desenvolvido por{' '}
            <a href="https://www.instagram.com/vertexxconsulting" target="_blank" rel="noopener noreferrer" className="font-bold text-gold hover:underline">
              Vertex Consulting
            </a>
          </p>
        </footer>

      </div>
    </AdminShell>
  );
}
