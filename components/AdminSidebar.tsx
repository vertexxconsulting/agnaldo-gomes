'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Menu, X, ArrowLeft, LogOut, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  hub?: boolean;
}

interface AdminSidebarProps {
  links: SidebarLink[];
  /** Conteúdo opcional do rodapé (ex.: botão de logout da loja) */
  footerItems?: React.ReactNode;
  /** URL de retorno exibida no item superior ("Voltar ao Site" etc.) */
  backLabel?: string;
  backHref?: string;
  /** Marca exibida na topbar (ícone + rótulo) para painéis com branding próprio */
  brand?: { icon: React.ComponentType<{ size?: number; className?: string }>; text: string };
}

/**
 * Sidebar administrativa compartilhada do novo design:
 * estreita (240px), colapsável, itens compactos e alinhados.
 */
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('ag-sessao');
    // Redireciona para a raiz do painel onde está
    const base =
      pathname.startsWith('/admin-academy')
        ? '/admin-academy/login'
        : pathname.startsWith('/admin-loja')
          ? '/admin-loja/login'
          : '/admin-secretaria/login';
    router.push(base);
  };

  const renderLinkItem = (link: SidebarLink) => {
    const Icon = link.icon;
    const active = link.href === '/hub' ? false : pathname === link.href || (link.href !== '/hub' && pathname.startsWith(link.href));
    const base = `flex items-center gap-2.5 px-2.5 py-[0.55rem] rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap group ${
      active
        ? 'bg-primary/10 text-primary'
        : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground'
    }`;
    return (
      <Link key={link.href} href={link.href} className={base} title={isCollapsed ? link.label : undefined}>
        <Icon size={17} className="shrink-0" />
        {!isCollapsed && (
          <>
            <span className="truncate">{link.label}</span>
            {link.hub && (
              <span className="ml-auto text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/15 text-primary shrink-0">
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
      {/* Sidebar Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 240 }}
        className="border-r border-[var(--border-subtle)] bg-[var(--color-card)] flex-col hidden md:flex shrink-0 relative z-20"
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-background border border-[var(--border-subtle)] rounded-full p-1 text-foreground/40 hover:text-primary hover:border-primary transition-colors z-30"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="px-4 h-16 flex items-center justify-between border-b border-[var(--border-subtle)]">
          {brand ? (
            <Link href={links.find(l => !l.hub)?.href ?? '/'} className="flex items-center gap-2 min-w-0">
              <span className="text-primary shrink-0">
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
                <div className="relative h-8 w-24 shrink-0">
                  <Image src="/logo-agnaldo.png" alt="Agnaldo Gomes" fill className="object-contain" priority />
                </div>
              ) : (
                <div className="relative h-9 w-9 shrink-0">
                  <Image src="/logo-agnaldo.png" alt="Agnaldo Gomes" fill className="object-contain" priority />
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
          {links.map(renderLinkItem)}
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

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-[var(--color-card)] border-b border-[var(--border-subtle)] z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1 -ml-1 text-foreground/70 hover:text-foreground"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="flex items-center">
          <div className="relative h-7 w-24">
            <Image src="/logo-agnaldo.png" alt="Agnaldo Gomes" fill className="object-contain" />
          </div>
        </Link>
        <div className="w-8" />
      </div>

      {/* Mobile Menu Overlay */}
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
                <div className="relative h-8 w-28">
                  <Image src="/logo-agnaldo.png" alt="Agnaldo Gomes" fill className="object-contain" />
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
                {links.map(link => (
                  <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)}>
                    {renderLinkItem(link)}
                  </Link>
                ))}
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
                  <LogOut size={17} />
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

/**
 * Shell do painel admin com sidebar compartilhada.
 */
export function AdminShell({
  children,
  sidebar,
  className,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {sidebar}
      <main className="flex-1 overflow-y-auto relative">
        <div className={cnWrap('pt-20 md:pt-8 px-4 sm:px-6 lg:px-8 pb-12 max-w-6xl mx-auto', className)}>
          {children}
        </div>
      </main>
    </div>
  );
}

function cnWrap(a: string, b?: string) {
  return b ? `${a} ${b}` : a;
}
