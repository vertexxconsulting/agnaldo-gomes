'use client';

import { Users, PlayCircle, Star, TrendingUp, Clock, CalendarDays, ShoppingBag, Sparkles } from 'lucide-react';
import { MOCK_CURSOS } from '@/lib/mock-data';
import { Button } from '@/components/Button';
import Link from 'next/link';

export default function AdminAcademyDashboard() {
  const stats = [
    { label: 'Alunos Ativos', value: '1,204', icon: Users, trend: '+12% este mês' },
    { label: 'Cursos Publicados', value: MOCK_CURSOS.length.toString(), icon: PlayCircle, trend: 'Estável' },
    { label: 'Taxa de Conclusão', value: '68%', icon: Star, trend: '+5% este mês' },
    { label: 'Tempo Médio', value: '12h/aluno', icon: Clock, trend: 'Estável' },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[var(--background)]">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Academy</h1>
          <p className="text-sm text-foreground/60">Bem-vindo à gestão exclusiva dos seus cursos e alunos online.</p>
        </div>
      </div>

      {/* Banner do ecossistema — acesso rápido aos demais módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { href: '/hub', label: 'Command Center', desc: 'Gerencie tudo em um só lugar', icon: Sparkles, grad: 'from-[#a8862a]/15 to-[#a8862a]/5', ico: 'text-primary' },
          { href: '/admin', label: 'Studio / Agenda', desc: 'Agendamentos e clientes', icon: CalendarDays, grad: 'from-sky-500/15 to-sky-500/5', ico: 'text-sky-600' },
          { href: '/admin-loja', label: 'Loja', desc: 'Produtos e pedidos', icon: ShoppingBag, grad: 'from-[#10B981]/15 to-[#10B981]/5', ico: 'text-[#10B981]' },
        ].map((e) => {
          const Icon = e.icon;
          return (
            <Link key={e.href} href={e.href}>
              <div className={`group rounded-xl border border-[var(--border-subtle)] bg-gradient-to-r ${e.grad} p-3.5 flex items-center gap-3 transition-all hover:shadow-md`}>
                <div className="w-10 h-10 rounded-lg bg-[var(--color-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                  <Icon size={18} className={e.ico} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{e.label}</p>
                  <p className="text-[11px] text-foreground/50">{e.desc}</p>
                </div>
                <Sparkles size={14} className="ml-auto text-foreground/20 group-hover:text-primary transition-all shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[var(--color-card)] p-6 rounded-xl border border-[var(--border-subtle)]">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Icon size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground/60 mb-1">{stat.label}</h3>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs font-medium text-primary mt-2">{stat.trend}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Atalhos Rápidos */}
        <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" /> Acesso Rápido
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg border border-[var(--border-subtle)]">
              <div>
                <h3 className="font-bold text-foreground">Catálogo de Cursos</h3>
                <p className="text-xs text-foreground/60">Adicione ou edite seus cursos.</p>
              </div>
              <Link href="/admin-academy/cursos">
                <Button variant="outline" size="sm">Acessar</Button>
              </Link>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg border border-[var(--border-subtle)]">
              <div>
                <h3 className="font-bold text-foreground">Alunos e Acessos</h3>
                <p className="text-xs text-foreground/60">Gerencie matrículas e progresso.</p>
              </div>
              <Link href="/admin-academy/alunos">
                <Button variant="outline" size="sm">Acessar</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Últimos Cursos Acessados */}
        <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Cursos em Destaque</h2>
          <div className="space-y-4">
            {MOCK_CURSOS.slice(0, 3).map((curso) => (
              <div key={curso.id} className="flex items-center gap-4 p-3 hover:bg-[var(--background)] rounded-lg transition-colors border border-transparent hover:border-[var(--border-subtle)]">
                <div 
                  className="w-16 h-12 rounded-lg bg-cover bg-center border border-[var(--border-subtle)]"
                  style={{ backgroundImage: `url(${curso.capaUrl})` }}
                />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">{curso.titulo}</h3>
                  <p className="text-xs text-foreground/50">{curso.totalAulas} aulas</p>
                </div>
                <Link href={`/admin-academy/cursos/${curso.id}`}>
                  <button className="text-xs font-medium text-primary hover:underline">Editar</button>
                </Link>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
