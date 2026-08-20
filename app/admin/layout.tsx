'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Users, Scissors, UserCircle, BookOpen, Command, GitMerge, ShieldCheck, Heart } from 'lucide-react';
import { AdminSidebar, AdminShell } from '@/components/AdminSidebar';
import { AdminUserButton } from '@/components/AdminUserButton';

const links = [
  { href: '/hub', label: 'Command Center', icon: Command, hub: true },
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/admin/noivas', label: 'Dia da Noiva', icon: Heart },
  { href: '/admin/clientes', label: 'Clientes (CRM)', icon: Users },
  { href: '/admin/profissionais', label: 'Profissionais', icon: UserCircle },
  { href: '/admin/servicos', label: 'Serviços', icon: Scissors },
  { href: '/admin/bolten', label: 'Bolten CRM', icon: GitMerge },
  { href: '/admin/pagamentos', label: 'Pagamentos', icon: ShieldCheck },
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
