'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Settings, Command, Store } from 'lucide-react';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminUserButton } from '@/components/AdminUserButton';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { canAccess, UserPermissions } from '@/lib/permissions';
import { getUserRole } from '@/lib/auth';

const links = [
  { href: '/hub', label: 'Command Center', icon: Command, hub: true, id: 'hub' },
  { href: '/admin-loja', label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
  { href: '/admin-loja/produtos', label: 'Produtos', icon: Package, id: 'loja_produtos' },
  { href: '/admin-loja/pedidos', label: 'Pedidos', icon: ShoppingCart, id: 'loja_pedidos' },
  { href: '/admin-loja/configuracoes', label: 'Configurações', icon: Settings, id: 'loja_configuracoes' },
];

export default function AdminLojaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userPermissions, setUserPermissions] = useState<UserPermissions | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } | { user: null } }) => {
      const user = data?.user;
      if (!user && pathname !== '/admin-loja/login') {
        router.replace('/admin-loja/login');
        return;
      }
      if (user) {
        setUserRole(getUserRole(user));
        setUserPermissions(user.user_metadata?.permissions);
      }
      setLoading(false);
    });
  }, [pathname, router]);

  if (pathname === '/admin-loja/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-foreground/50 font-medium">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  const filteredLinks = links.filter(link => {
    if (link.id === 'hub' || link.id === 'dashboard') return true;
    return canAccess(userPermissions, link.id as any, userRole || undefined);
  });

  const sidebar = (
    <AdminSidebar
      links={filteredLinks}
      backLabel="Voltar à Loja"
      backHref="/loja"
      brand={{ icon: Store, text: 'Loja' }}
      footerItems={<AdminUserButton isCollapsed={false} logoutHref="/admin-loja/login" />}
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
