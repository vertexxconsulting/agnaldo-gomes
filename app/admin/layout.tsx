'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Users, Scissors, UserCircle, BookOpen, Command, GitMerge, ShieldCheck, Heart, TrendingUp, Megaphone, Bot } from 'lucide-react';
import { AdminSidebar, AdminShell } from '@/components/AdminSidebar';
import { AdminUserButton } from '@/components/AdminUserButton';

const links = [
  { href: '/hub', label: 'Command Center', icon: Command, hub: true },
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  // Operacional Diário
  { href: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/admin/clientes', label: 'Clientes (CRM)', icon: Users },
  { href: '/admin/noivas', label: 'Dia da Noiva', icon: Heart },
  { href: '/admin/pagamentos', label: 'Pagamentos', icon: ShieldCheck },
  // Cadastros
  { href: '/admin/servicos', label: 'Serviços', icon: Scissors },
  { href: '/admin/profissionais', label: 'Profissionais', icon: UserCircle },
  // Gestão & Ferramentas
  { href: '/admin/relatorios', label: 'Relatórios', icon: TrendingUp, adminOnly: true },
  { href: '/admin/marketing', label: 'Marketing & Mensagens', icon: Megaphone },
  { href: '/admin/bolten', label: 'Bolten CRM', icon: GitMerge },
  { href: '/admin/ia-assistente', label: 'IA Assistente', icon: Bot, adminOnly: true },
  { href: '/admin/tutorial', label: 'Ajuda / Tutorial', icon: BookOpen },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin/login') || pathname === '/admin-secretaria/login') {
    return <>{children}</>;
  }

  const sidebar = (
    <AdminSidebar
      links={links}
      backLabel="Voltar ao Site"
      backHref="/"
      footerItems={<AdminUserButton isCollapsed={false} />}
    />
  );

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {sidebar}
      <main className="flex-1 overflow-y-auto relative">
        <div className="pt-16 md:pt-0 px-4 sm:px-6 lg:px-8 pb-12 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
