'use client';

import { usePathname } from 'next/navigation';
import { Command, LayoutDashboard, CalendarDays, Users, Heart, ShieldCheck, Scissors, UserCircle, TrendingUp, Megaphone, GitMerge, BookOpen, Bot, Moon, Gift, Globe, Receipt, Package, DollarSign } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminUserButton } from '@/components/AdminUserButton';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { canAccess, UserPermissions } from '@/lib/permissions';
import { getUserRole } from '@/lib/auth';

const links = [
  { href: '/hub', label: 'Command Center', icon: Command, hub: true, adminOnly: true, id: 'hub' },
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
  { href: '/admin/meu-painel', label: 'Meu Painel', icon: Scissors, id: 'meu-painel' },
  // Operacional Diário
  { href: '/admin/agenda', label: 'Agenda', icon: CalendarDays, id: 'agenda' },
  { href: '/admin/clientes', label: 'Clientes (CRM)', icon: Users, id: 'clientes' },
  { href: '/admin/noivas', label: 'Dia da Noiva', icon: Heart, id: 'noivas' },
  { href: '/admin/pagamentos', label: 'Pagamentos', icon: ShieldCheck, adminOnly: true, id: 'pagamentos' },
  { href: '/admin/notas-fiscais', label: 'Notas Fiscais', icon: Receipt, id: 'notas-fiscais' },
  // Cadastros
  { href: '/admin/servicos', label: 'Serviços', icon: Scissors, id: 'servicos' },
  { href: '/admin/profissionais', label: 'Profissionais', icon: UserCircle, id: 'profissionais' },
  { href: '/admin/estoque', label: 'Estoque', icon: Package, adminOnly: true, id: 'estoque' },
  { href: '/admin/equipe', label: 'Gestão de Equipe', icon: Users, adminOnly: true, id: 'equipe' },
  // Financeiro
  { href: '/admin/comissoes', label: 'Comissões', icon: DollarSign, adminOnly: true, id: 'comissoes' },
  // Gestão & Ferramentas
  { href: '/admin/relatorios', label: 'Relatórios', icon: TrendingUp, id: 'relatorios' },
  { href: '/admin/fidelidade', label: 'Prog. Fidelidade', icon: Gift, adminOnly: true, id: 'fidelidade' },
  { href: '/admin/marketing', label: 'Marketing & Mensagens', icon: Megaphone, id: 'marketing' },
  { href: '/admin/ia-assistente', label: 'IA Assistente', icon: Bot, adminOnly: true, id: 'ia-assistente' },
  { href: '/admin/api', label: 'Sistema API', icon: Globe, adminOnly: true, id: 'api' },
  { href: '/admin/sistema', label: 'Gestão do Sistema', icon: ShieldCheck, adminOnly: true, id: 'sistema' },
  { href: '/admin/tutorial', label: 'Ajuda / Tutorial', icon: BookOpen, id: 'tutorial' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userPermissions, setUserPermissions] = useState<UserPermissions | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) {
        setUserRole(getUserRole(user));
        setUserPermissions(user.user_metadata?.permissions);
      }
      setLoading(false);
    });
  }, []);

  if (pathname.startsWith('/admin/login') || pathname === '/admin-secretaria/login') {
    return <>{children}</>;
  }

  const filteredLinks = links.filter(link => {
    // Sempre mostrar os básicos
    if (link.id === 'hub' || link.id === 'dashboard' || link.id === 'ia-assistente' || link.id === 'api' || link.id === 'sistema' || link.id === 'tutorial' || link.id === 'noivas') {
      if (link.adminOnly && userRole !== 'ADMIN' && userRole !== 'studio_admin') return false;
      return true;
    }
    // Verificar pelas novas permissões
    return canAccess(userPermissions, link.id as any, userRole || undefined);
  });

  const sidebar = (
    <AdminSidebar
      links={filteredLinks}
      backLabel="Voltar ao Site"
      backHref="/"
      footerItems={<AdminUserButton isCollapsed={false} />}
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
