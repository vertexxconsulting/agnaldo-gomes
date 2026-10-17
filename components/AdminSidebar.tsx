'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Quando recolhido, o menu expande (sobreposto ao conteúdo) ao passar o mouse
  const compact = isCollapsed && !isHovered;

  const handleMouseEnter = () => {
    if (!isCollapsed) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setIsHovered(true), 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setIsHovered(false);
  };

  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  // Confirmar role via Supabase e manter localStorage sincronizado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRole = localStorage.getItem('ag-user-role');
      if (savedRole) setUserRole(savedRole);
    }

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
        title={compact ? link.label : undefined}
      >
        <Icon size={17} className="shrink-0" />
        {!compact && (
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
        className="hidden md:block shrink-0 relative z-40 h-full"
      >
        <button
          onClick={() => { setIsCollapsed(!isCollapsed); handleMouseLeave(); }}
          className={`absolute -right-3 top-6 bg-background border border-[var(--border-subtle)] rounded-full p-1 text-foreground/40 hover:text-gold hover:border-gold transition-all z-30 ${isCollapsed && isHovered ? 'opacity-0 pointer-events-none' : ''}`}
          title={isCollapsed ? 'Fixar menu aberto' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <motion.div
          initial={false}
          animate={{ width: compact ? 72 : 240 }}
          transition={{ type: 'tween', duration: 0.18 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute inset-y-0 left-0 flex flex-col overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--color-card)] ${
            isCollapsed && isHovered ? 'shadow-2xl' : ''
          }`}
        >
        <div className="px-4 h-16 flex items-center justify-between border-b border-[var(--border-subtle)] shrink-0">
          {brand ? (
            <Link href={links.find(l => !l.hub)?.href ?? '/'} className="flex items-center gap-2 min-w-0">
              <span className="text-gold shrink-0">
                <brand.icon size={22} />
              </span>
              <AnimatePresence>
                {!compact && (
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
              {!compact ? (
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

        <div className="px-3 py-2 border-b border-[var(--border-subtle)] shrink-0">
          <Link href={backHref}>
            <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-foreground/45 hover:text-foreground rounded-md transition-colors whitespace-nowrap">
              <ArrowLeft size={13} />
              {!compact && <span>{backLabel}</span>}
            </div>
          </Link>
        </div>

        <nav className="flex-1 min-h-0 px-3 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {links.map(link => renderLinkItem(link, handleMouseLeave))}
        </nav>

        <div className="px-3 py-2 border-t border-[var(--border-subtle)] space-y-1 shrink-0">
          {footerItems ? (
            typeof footerItems === 'object' && 'props' in (footerItems as any)
              ? (
                  {...footerItems, props: { ...(footerItems as any).props, isCollapsed: compact }} as any
                )
              : footerItems
          ) : (
            <Link href="/loja">
              <div className="flex items-center gap-2.5 px-2.5 py-[0.55rem] rounded-lg text-[13px] font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground transition-colors whitespace-nowrap">
                <ExternalLink size={17} className="shrink-0" />
                {!compact && <span className="truncate">Ver Loja</span>}
              </div>
            </Link>
          )}
          {!footerItems && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-[0.55rem] rounded-lg text-[13px] font-medium text-danger/80 hover:bg-danger/5 hover:text-danger transition-colors whitespace-nowrap"
            >
              <LogOut size={17} className="shrink-0" />
              {!compact && <span>Sair</span>}
            </button>
          )}
        </div>

        {!compact && (
          <div className="px-4 pb-3 pt-1 text-center shrink-0 whitespace-nowrap">
            <p className="text-[10px] text-foreground/30">
              Desenvolvido por <span className="font-semibold text-foreground/45">Vertex Consulting</span>
            </p>
          </div>
        )}
        </motion.div>
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
              <div className="flex items-center justify-between px-4 h-16 border-b border-[var(--border-subtle)] shrink-0">
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
              <div className="p-3 border-t border-[var(--border-subtle)] space-y-1 shrink-0 pb-safe">
                {footerItems ? (
                  typeof footerItems === 'object' && 'props' in (footerItems as any)
                    ? (
                        {...footerItems, props: { ...(footerItems as any).props, isCollapsed: false }} as any
                      )
                    : footerItems
                ) : null}
                {!footerItems && (
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
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
