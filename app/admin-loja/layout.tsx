'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Settings, Command, Store } from 'lucide-react';
import { AdminSidebar } from '@/components/AdminSidebar';

const links = [
  { href: '/hub', label: 'Command Center', icon: Command, hub: true },
  { href: '/admin-loja', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin-loja/produtos', label: 'Produtos', icon: Package },
  { href: '/admin-loja/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { href: '/admin-loja/configuracoes', label: 'Configurações', icon: Settings },
];

export default function AdminLojaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin-loja/login') {
    return <>{children}</>;
  }

  const sidebar = (
    <AdminSidebar
      links={links}
      backLabel="Voltar à Loja"
      backHref="/loja"
      brand={{ icon: Store, text: 'Loja' }}
      footerItems={null}
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
