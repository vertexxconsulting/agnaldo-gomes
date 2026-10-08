'use client';

import { usePathname } from 'next/navigation';
import { Command, LayoutDashboard, GraduationCap, PlayCircle, Users, BookOpen, Award, Settings, CreditCard, Video, Calendar, Star } from 'lucide-react';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminUserButton } from '@/components/AdminUserButton';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { canAccess, UserPermissions } from '@/lib/permissions';
import { getUserRole } from '@/lib/auth';

const links = [
  { href: '/hub', label: 'Command Center', icon: Command, hub: true, id: 'hub' },
  { href: '/admin-academy', label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
  { href: '/admin-academy/cursos', label: 'Gestão de Cursos', icon: PlayCircle, id: 'academy_cursos' },
  { href: '/admin-academy/cursos-vip', label: 'Cursos VIP (Presencial)', icon: Star, id: 'academy_cursos_vip' },
  { href: '/admin-academy/agenda-vip', label: 'Agenda VIP', icon: Calendar, id: 'academy_agenda_vip' },
  { href: '/admin-academy/alunos', label: 'Gestão de Alunos', icon: GraduationCap, id: 'academy_alunos' },
  { href: '/admin-academy/comunidade', label: 'Comunidade', icon: Users, id: 'academy_comunidade' },
  { href: '/admin-academy/certificados', label: 'Certificados', icon: Award, id: 'academy_certificados' },
  { href: '/admin-academy/configuracoes', label: 'Configurações', icon: Settings, id: 'academy_configuracoes' },
  { href: '/admin-academy/vimeo', label: 'Hospedagem de Vídeos', icon: Video, id: 'academy_vimeo' },
  { href: '/admin-academy/tutorial', label: 'Ajuda / Tutorial', icon: BookOpen, id: 'tutorial' },
];

export default function AdminAcademyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userPermissions, setUserPermissions] = useState<UserPermissions | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } | { user: null } }) => {
      const user = data?.user;
      if (user) {
        setUserRole(getUserRole(user));
        setUserPermissions(user.user_metadata?.permissions);
      }
    });
  }, []);

  if (pathname === '/admin-academy/login') {
    return <>{children}</>;
  }

  const filteredLinks = links.filter(link => {
    if (link.id === 'hub' || link.id === 'dashboard' || link.id === 'tutorial') return true;
    return canAccess(userPermissions, link.id as any, userRole || undefined);
  });

  const sidebar = (
    <AdminSidebar
      links={filteredLinks}
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
        {/* Removido ThemeToggle conforme solicitação */}
        <div className="pt-16 md:pt-0 px-4 sm:px-6 lg:px-8 pb-12 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
