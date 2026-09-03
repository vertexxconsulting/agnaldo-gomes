import { Users, PlayCircle, Star, Clock, CalendarDays, ShoppingBag, Sparkles } from 'lucide-react';
import { getCursos } from '@/lib/mock-data';
import { Button } from '@/components/Button';
import { SectionHeader, Panel } from '@/components/ui/Panel';
import Link from 'next/link';

export default async function AdminAcademyDashboard() {
  const cursos = await getCursos();

  const stats = [
    { label: 'Alunos Ativos', value: '0', icon: Users, trend: '-' },
    { label: 'Cursos Publicados', value: cursos.length.toString(), icon: PlayCircle, trend: '-' },
    { label: 'Taxa de Conclusão', value: '0%', icon: Star, trend: '-' },
    { label: 'Tempo Médio', value: '0h/aluno', icon: Clock, trend: '-' },
  ];

  return (
    <div className="flex flex-col w-full space-y-7 py-2">
      <SectionHeader eyebrow="Gestão de cursos e alunos" title="Painel Academy" />

      {/* Banner do ecossistema — acesso rápido aos demais módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {[
          { href: '/hub', label: 'Command Center', desc: 'Gerencie tudo em um só lugar', icon: Sparkles, grad: 'from-[#a8862a]/15 to-[#a8862a]/5', ico: 'text-primary' },
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
                <Sparkles size={14} className="ml-auto text-foreground/20 group-hover:text-primary transition-all shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Panel key={i} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10.5px] uppercase tracking-[0.08em] font-medium text-foreground/45">{stat.label}</p>
                  <div className="text-lg font-bold text-foreground leading-tight">{stat.value}</div>
                  <p className="text-[11px] font-medium text-primary">{stat.trend}</p>
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
                <p className="text-[11px] text-foreground/60">Adicione ou edite seus cursos.</p>
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
          </div>
        </Panel>

        {/* Últimos Cursos Acessados */}
        <Panel title="Cursos em Destaque">
          <div className="space-y-2.5">
            {cursos.length > 0 ? (
              cursos.slice(0, 3).map((curso) => (
                <div key={curso.id} className="flex items-center gap-3 p-2.5 hover:bg-[var(--background)] rounded-lg transition-colors border border-transparent hover:border-[var(--border-subtle)]">
                  <div
                    className="w-14 h-10 rounded-lg bg-cover bg-center border border-[var(--border-subtle)] shrink-0 bg-primary/10"
                    style={curso.capaUrl ? { backgroundImage: `url(${curso.capaUrl})` } : {}}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-semibold text-foreground line-clamp-1">{curso.titulo}</h3>
                    <p className="text-[11px] text-foreground/50">{curso.totalAulas} aulas</p>
                  </div>
                  <Link href={`/admin-academy/cursos/${curso.id}`}>
                    <button className="text-[11px] font-semibold text-primary hover:underline">Editar</button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center p-6 bg-[var(--background)] rounded-lg border border-[var(--border-subtle)] border-dashed">
                <p className="text-sm text-foreground/50">Nenhum curso cadastrado no momento.</p>
              </div>
            )}
          </div>
        </Panel>

      </div>
    </div>
  );
}
