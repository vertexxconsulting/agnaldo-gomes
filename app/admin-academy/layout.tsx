'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, GraduationCap, PlayCircle, Settings, Users, BookOpen, Award, Command } from 'lucide-react';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminUserButton } from '@/components/AdminUserButton';

const links = [
  { href: '/hub', label: 'Command Center', icon: Command, hub: true },
  { href: '/admin-academy', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin-academy/cursos', label: 'Gestão de Cursos', icon: PlayCircle },
  { href: '/admin-academy/alunos', label: 'Gestão de Alunos', icon: GraduationCap },
  { href: '/admin-academy/comunidade', label: 'Comunidade', icon: Users },
  { href: '/admin-academy/certificados', label: 'Certificados', icon: Award },
  { href: '/admin-academy/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/admin-academy/tutorial', label: 'Ajuda / Tutorial', icon: BookOpen },
];

export default function AdminAcademyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin-academy/login') {
    return <>{children}</>;
  }

  const sidebar = (
    <AdminSidebar
      links={links}
      backLabel="Voltar ao Site"
      backHref="/"
      brand={{ icon: GraduationCap, text: 'Academy' }}
      footerItems={<AdminUserButton isCollapsed={false} profileHref="/admin-academy/perfil" settingsHref="/admin-academy/configuracoes" logoutHref="/admin-academy/login" />}
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
