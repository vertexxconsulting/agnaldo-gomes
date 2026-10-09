'use client';

import { usePathname } from 'next/navigation';
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

  if (pathname === '/admin-loja/login') {
    return <>{children}</>;
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
