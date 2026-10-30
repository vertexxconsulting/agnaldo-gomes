'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Command, LayoutDashboard, CalendarDays, Users, Heart, ShieldCheck, Scissors, UserCircle, TrendingUp, Megaphone, MessageCircle, GitMerge, BookOpen, Bot, Moon, Gift, Globe, Receipt, Package, DollarSign, Wallet } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminUserButton } from '@/components/AdminUserButton';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { canAccess, UserPermissions } from '@/lib/permissions';
import { getUserRole, ROLES } from '@/lib/auth';
import { Toaster } from 'sonner';
import { FloatingAssistant } from '@/components/FloatingAssistant';
import { PWAManifestSwitch } from '@/components/PWAManifestSwitch';

const links = [
  { href: '/hub', label: 'Command Center', icon: Command, hub: true, adminOnly: true, id: 'hub' },
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
  { href: '/admin/meu-painel', label: 'Meu Painel', icon: Scissors, id: 'meu-painel' },
  // Operacional Diário
  { href: '/admin/agenda', label: 'Agenda', icon: CalendarDays, id: 'agenda' },
  { href: '/admin/clientes', label: 'Clientes (CRM)', icon: Users, id: 'clientes' },
  { href: '/admin/noivas', label: 'Dia da Noiva', icon: Heart, id: 'noivas' },
  { href: '/admin/pagamentos', label: 'Financeiro & Caixa', icon: Wallet, adminOnly: true, id: 'pagamentos' },
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
  { href: '/admin/marketing', label: 'Mensagens WhatsApp', icon: MessageCircle, id: 'marketing' },
  { href: '/admin/ia-assistente', label: 'IA Assistente', icon: Bot, adminOnly: true, id: 'ia-assistente' },
  { href: '/admin/api', label: 'Sistema API', icon: Globe, adminOnly: true, id: 'api' },
  { href: '/admin/sistema', label: 'Gestão do Sistema', icon: ShieldCheck, adminOnly: true, id: 'sistema' },
  { href: '/admin/tutorial', label: 'Ajuda / Tutorial', icon: BookOpen, id: 'tutorial' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userPermissions, setUserPermissions] = useState<UserPermissions | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;

        if (!user) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        const role = getUserRole(user);
        if (role === ROLES.ALUNO) {
          router.replace('/aluno');
          return;
        }
        if (role === ROLES.CUSTOMER) {
          router.replace('/');
          return;
        }

        setUserRole(role);
        setUserPermissions(user.user_metadata?.permissions);
      } catch (err) {
        console.error('Erro ao verificar autenticação no painel administrativo:', err);
        if (mounted) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (mounted) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [pathname, router]);

  if (pathname.startsWith('/admin/login') || pathname === '/admin-secretaria/login') {
    return (
      <>
        <PWAManifestSwitch manifest="/manifest-admin.json" />
        {children}
      </>
    );
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
    <div className="flex h-screen bg-[var(--color-background)] overflow-hidden font-body antialiased">
      <PWAManifestSwitch manifest="/manifest-admin.json" />
      {sidebar}
      <main className="flex-1 overflow-y-auto relative">
        <div className="pt-14 md:pt-2 px-3 sm:px-5 lg:px-6 pb-10 w-full max-w-none">
          {children}
        </div>
      </main>
      <Toaster position="top-right" richColors />
      <FloatingAssistant />
    </div>
  );
}
