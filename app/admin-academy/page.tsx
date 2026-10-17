'use client';

import { useState, useEffect } from 'react';
import { Users, PlayCircle, Star, Clock, CalendarDays, ShoppingBag, Sparkles, DollarSign, Globe, EyeOff, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { SectionHeader, Panel } from '@/components/ui/Panel';
import Link from 'next/link';

interface DashboardStats {
  totalAlunos: number;
  alunosAtivos: number;
  cursosPublicados: number;
  cursosTotal?: number;
  cursosRascunho?: number;
  totalMatriculas: number;
  taxaConclusao: number;
  receitaTotal: number;
  aulasConcluidas: number;
  totalAulas: number;
}

interface CursoItem {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  thumbnail_url?: string;
  status: string;
  created_at?: string;
  totalAulas?: number;
}

export default function AdminAcademyDashboard() {
  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      const [cursosRes, statsRes] = await Promise.all([
        fetch('/api/admin-academy/cursos', { cache: 'no-store' }).then(r => r.json()).catch(() => []),
        fetch('/api/admin-academy/dashboard/stats', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      ]);
      
      if (Array.isArray(cursosRes)) {
        setCursos(cursosRes);
      }
      
      if (statsRes && !statsRes.error) {
        setStats(statsRes);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard da Academy:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleTogglePublish = async (cursoId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setPublishingId(cursoId);
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        // Atualizar lista local e recarregar stats
        setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, status: nextStatus } : c));
        carregarDados();
      } else {
        const err = await res.json();
        alert('Erro ao alterar status: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao alternar publicação:', err);
      alert('Erro de conexão');
    } finally {
      setPublishingId(null);
    }
  };

  const statCards = stats ? [
    { 
      label: 'Alunos Ativos', 
      value: stats.alunosAtivos.toString(), 
      icon: Users, 
      trend: `${stats.totalMatriculas} matrículas` 
    },
    { 
      label: 'Cursos Publicados', 
      value: stats.cursosPublicados.toString(), 
      icon: PlayCircle, 
      trend: stats.cursosRascunho && stats.cursosRascunho > 0 
        ? `${stats.cursosRascunho} em rascunho` 
        : (stats.cursosTotal ? `${stats.cursosTotal} no total` : 'Nenhum rascunho')
    },
    { 
      label: 'Taxa de Conclusão', 
      value: `${stats.taxaConclusao}%`, 
      icon: Star, 
      trend: `${stats.aulasConcluidas} aulas concluídas` 
    },
    { 
      label: 'Receita Total', 
      value: `R$ ${stats.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: DollarSign, 
      trend: 'Cursos pagos' 
    },
  ] : [
    { label: 'Alunos Ativos', value: '...', icon: Users, trend: '-' },
    { label: 'Cursos Publicados', value: '...', icon: PlayCircle, trend: '-' },
    { label: 'Taxa de Conclusão', value: '...', icon: Star, trend: '-' },
    { label: 'Receita Total', value: '...', icon: DollarSign, trend: '-' },
  ];

  return (
    <div className="flex flex-col w-full space-y-7 py-2">
      <SectionHeader eyebrow="Gestão de cursos e alunos" title="Painel Academy" />

      {/* Banner do ecossistema — acesso rápido aos demais módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {[
          { href: '/hub', label: 'Command Center', desc: 'Gerencie tudo em um só lugar', icon: Sparkles, grad: 'from-[#a8862a]/15 to-[#a8862a]/5', ico: 'text-gold' },
          { href: '/admin', label: 'Studio / Agenda', desc: 'Agendamentos e clientes', icon: CalendarDays, grad: 'from-sky-500/15 to-sky-500/5', ico: 'text-sky-600' },
          { href: '/admin-loja', label: 'Loja', desc: 'Produtos e pedidos', icon: ShoppingBag, grad: 'from-[#10B981]/15 to-[#10B981]/5', ico: 'text-[#10B981]' },
        ].map((e) => {
          const Icon = e.icon;
          return (
            <Link key={e.href} href={e.href}>
              <div className={`group rounded-xl border border-[var(--border-subtle)] bg-gradient-to-r ${e.grad} p-3 flex items-center gap-3 transition-all hover:shadow-md`}>
                <div className="w-9 h-9 rounded-lg bg-[var(--color-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                  <Icon size={17} className={e.ico} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate">{e.label}</p>
                  <p className="text-[11px] text-foreground/50">{e.desc}</p>
                </div>
                <Sparkles size={14} className="ml-auto text-foreground/20 group-hover:text-gold transition-all shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Panel key={i} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold shrink-0">
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10.5px] uppercase tracking-[0.08em] font-medium text-foreground/45">{stat.label}</p>
                  <div className="text-lg font-bold text-foreground leading-tight">{loading ? '...' : stat.value}</div>
                  <p className="text-[11px] font-medium text-gold truncate">{stat.trend}</p>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Atalhos Rápidos */}
        <Panel title="Acesso Rápido">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg border border-[var(--border-subtle)]">
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Catálogo de Cursos</h3>
                <p className="text-[11px] text-foreground/60">Adicione, edite e publique seus cursos.</p>
              </div>
              <Link href="/admin-academy/cursos">
                <Button variant="outline" size="sm">Acessar</Button>
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg border border-[var(--border-subtle)]">
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Alunos e Acessos</h3>
                <p className="text-[11px] text-foreground/60">Gerencie matrículas e progresso.</p>
              </div>
              <Link href="/admin-academy/alunos">
                <Button variant="outline" size="sm">Acessar</Button>
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg border border-[var(--border-subtle)]">
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Cursos Presenciais / VIP</h3>
                <p className="text-[11px] text-foreground/60">Turmas práticas e agenda com Agnaldo Gomes.</p>
              </div>
              <Link href="/admin-academy/cursos-vip">
                <Button variant="outline" size="sm">Acessar</Button>
              </Link>
            </div>
          </div>
        </Panel>

        {/* Cursos Cadastrados com Status Real */}
        <Panel 
          title="Seus Cursos Cadastrados"
          action={
            <Link href="/admin-academy/cursos" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={13} />
            </Link>
          }
        >
          <div className="space-y-2.5">
            {loading ? (
              <div className="py-8 text-center text-xs text-foreground/40">Carregando cursos...</div>
            ) : cursos.length > 0 ? (
              cursos.slice(0, 4).map((curso) => {
                const isPublished = curso.status === 'PUBLISHED';
                const isPublishing = publishingId === curso.id;

                return (
                  <div key={curso.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-[var(--background)] rounded-xl transition-all border border-[var(--border-subtle)] bg-[var(--color-card)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-lg bg-cover bg-center border border-[var(--border-subtle)] shrink-0 bg-gold/10 overflow-hidden relative"
                        style={{ backgroundImage: `url(${curso.thumbnail_url || '/agnaldo1.webp'})` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-bold text-foreground truncate">{curso.title}</h3>
                          {isPublished ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 size={10} className="text-emerald-700" /> Publicado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                              <EyeOff size={10} className="text-amber-800" /> Rascunho
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground/50 mt-0.5">
                          {isPublished 
                            ? 'Visível para os alunos na plataforma' 
                            : 'Oculto dos alunos (clique em Publicar para liberar)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!isPublished ? (
                        <button
                          onClick={() => handleTogglePublish(curso.id, curso.status)}
                          disabled={isPublishing}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                          title="Publicar agora para aparecer aos alunos"
                        >
                          {isPublishing ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Globe size={12} />
                              <span>Publicar</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTogglePublish(curso.id, curso.status)}
                          disabled={isPublishing}
                          className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-amber-500/10 text-foreground/70 hover:text-amber-700 font-medium text-[11px] transition-all disabled:opacity-50"
                          title="Reverter para rascunho"
                        >
                          {isPublishing ? <Loader2 size={12} className="animate-spin" /> : 'Despublicar'}
                        </button>
                      )}

                      <Link href={`/admin-academy/cursos/${curso.id}`}>
                        <button className="px-2.5 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold text-xs transition-colors">
                          Editar
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-[var(--background)] rounded-lg border border-[var(--border-subtle)] border-dashed text-center">
                <PlayCircle size={24} className="text-gold/40 mb-2" />
                <p className="text-sm font-semibold text-foreground">Nenhum curso cadastrado ainda.</p>
                <Link href="/admin-academy/cursos" className="text-xs font-bold text-gold hover:underline mt-1">
                  Criar primeiro curso
                </Link>
              </div>
            )}
          </div>
        </Panel>

      </div>
    </div>
  );
}