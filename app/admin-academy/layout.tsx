'use client';

import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [userPermissions, setUserPermissions] = useState<UserPermissions | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } | { user: null } }) => {
      const user = data?.user;
      if (!user && pathname !== '/admin-academy/login') {
        router.replace('/admin-academy/login');
        return;
      }
      if (user) {
        setUserRole(getUserRole(user));
        setUserPermissions(user.user_metadata?.permissions);
      }
      setLoading(false);
    });
  }, [pathname, router]);

  if (pathname === '/admin-academy/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-foreground/50 font-medium">Verificando acesso...</p>
        </div>
      </div>
    );
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
