'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Menu, X, ArrowLeft, LogOut, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ROLES, getUserRole } from '@/lib/auth';

export interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  hub?: boolean;
  adminOnly?: boolean;
}

interface AdminSidebarProps {
  links: SidebarLink[];
  footerItems?: React.ReactNode;
  backLabel?: string;
  backHref?: string;
  brand?: { icon: React.ComponentType<{ size?: number; className?: string }>; text: string };
}

export function AdminSidebar({
  links,
  footerItems,
  backLabel = 'Voltar ao Site',
  backHref = '/',
  brand,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('ag-user-role');
    return null;
  });

  // Confirmar role via Supabase e manter localStorage sincronizado
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } | null }) => {
      const role = getUserRole(data?.user);
      if (role) {
        setUserRole(role);
        localStorage.setItem('ag-user-role', role);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('ag-sessao');
    localStorage.removeItem('ag-user-role');
    localStorage.removeItem('ag_active_session');
    const base =
      pathname.startsWith('/admin-academy')
        ? '/admin-academy/login'
        : pathname.startsWith('/admin-loja')
          ? '/admin-loja/login'
          : '/admin-secretaria/login';
    router.push(base);
  };

  const renderLinkItem = (link: SidebarLink, onNavigate?: () => void) => {
    // Esconder links adminOnly se o papel do usuário não for admin
    const isAdmin = !userRole || userRole === ROLES.STUDIO_ADMIN || userRole === ROLES.ADMIN;
    if (link.adminOnly && !isAdmin) {
      return null;
    }

    const Icon = link.icon;
    const isRoot = links.some(other => other.href !== link.href && other.href.startsWith(link.href + '/'));
    const active = link.href === '/hub'
      ? pathname === '/hub'
      : isRoot
      ? pathname === link.href
      : pathname === link.href || pathname.startsWith(link.href + '/');

    const base = `flex items-center gap-2.5 px-2.5 py-[0.55rem] rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap group ${
      active
        ? 'bg-gold/10 text-gold font-semibold'
        : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground'
    }`;

    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => {
          if (typeof onNavigate === 'function') onNavigate();
        }}
        className={base}
        title={isCollapsed ? link.label : undefined}
      >
        <Icon size={17} className="shrink-0" />
        {!isCollapsed && (
          <>
            <span className="truncate">{link.label}</span>
            {link.hub && (
              <span className="ml-auto text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-gold/15 text-gold shrink-0">
                Hub
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 240 }}
        className="border-r border-[var(--border-subtle)] bg-[var(--color-card)] flex-col hidden md:flex shrink-0 relative z-20"
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-background border border-[var(--border-subtle)] rounded-full p-1 text-foreground/40 hover:text-gold hover:border-gold transition-colors z-30"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="px-4 h-16 flex items-center justify-between border-b border-[var(--border-subtle)]">
          {brand ? (
            <Link href={links.find(l => !l.hub)?.href ?? '/'} className="flex items-center gap-2 min-w-0">
              <span className="text-gold shrink-0">
                <brand.icon size={22} />
              </span>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-serif font-bold text-[15px] tracking-tight text-foreground truncate"
                  >
                    {brand.text}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2 min-w-0">
              {!isCollapsed ? (
                <div className="relative h-14 w-40 shrink-0 -ml-2">
                  <Image src="/logo-agnaldo.svg" alt="Agnaldo Gomes" fill className="object-contain object-left" priority />
                </div>
              ) : (
                <div className="relative h-10 w-10 shrink-0">
                  <Image src="/logo-agnaldo.svg" alt="Agnaldo Gomes" fill className="object-contain" priority />
                </div>
              )}
            </Link>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-1 text-foreground/50 hover:text-foreground"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
          <Link href={backHref}>
            <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-foreground/45 hover:text-foreground rounded-md transition-colors">
              <ArrowLeft size={13} />
              {!isCollapsed && <span>{backLabel}</span>}
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {links.map(link => renderLinkItem(link))}
        </nav>

        <div className="px-3 py-2 border-t border-[var(--border-subtle)] space-y-1">
          {footerItems ?? (
            <Link href="/loja">
              <div className="flex items-center gap-2.5 px-2.5 py-[0.55rem] rounded-lg text-[13px] font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground transition-colors">
                <ExternalLink size={17} className="shrink-0" />
                {!isCollapsed && <span className="truncate">Ver Loja</span>}
              </div>
            </Link>
          )}
          {footerItems === null && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-[0.55rem] rounded-lg text-[13px] font-medium text-danger/80 hover:bg-danger/5 hover:text-danger transition-colors"
            >
              <LogOut size={17} className="shrink-0" />
              {!isCollapsed && <span>Sair</span>}
            </button>
          )}
        </div>

        {!isCollapsed && (
          <div className="px-4 pb-3 pt-1 text-center">
            <p className="text-[10px] text-foreground/30">
              Desenvolvido por <span className="font-semibold text-foreground/45">Vertex Consulting</span>
            </p>
          </div>
        )}
      </motion.aside>

      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-[var(--color-card)] border-b border-[var(--border-subtle)] z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1 -ml-1 text-foreground/70 hover:text-foreground"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="flex items-center">
          <div className="relative h-10 w-32 -ml-2">
            <Image src="/logo-agnaldo.svg" alt="Agnaldo Gomes" fill className="object-contain object-left" />
          </div>
        </Link>
        <div className="w-8" />
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 w-64 bg-[var(--color-card)] z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-[var(--border-subtle)]">
                <div className="relative h-12 w-36 -ml-2">
                  <Image src="/logo-agnaldo.svg" alt="Agnaldo Gomes" fill className="object-contain object-left" />
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-foreground/50 hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                <Link href={backHref} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-foreground/60">
                    <ArrowLeft size={17} />
                    {backLabel}
                  </div>
                </Link>
                {links.map(link => renderLinkItem(link, () => setIsMobileMenuOpen(false)))}
              </nav>
              <div className="p-3 border-t border-[var(--border-subtle)] space-y-1">
                {footerItems}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-danger/80 hover:bg-danger/5 transition-colors"
                >
                  <LogOut size={17} className="shrink-0" />
                  Sair
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
