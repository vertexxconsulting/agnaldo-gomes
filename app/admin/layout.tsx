'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Users, Scissors, UserCircle, LogOut, Database, ChevronLeft, ChevronRight, Menu, ArrowLeft, X, BookOpen, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminUserButton } from '@/components/AdminUserButton';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
    { href: '/admin/clientes', label: 'Clientes (CRM)', icon: Users },
    { href: '/admin/profissionais', label: 'Profissionais', icon: UserCircle },
    { href: '/admin/servicos', label: 'Serviços', icon: Scissors },
    { href: '/admin/loja', label: 'Gestão da Loja', icon: ShoppingBag },
    { href: '/admin/tutorial', label: 'Ajuda / Tutorial', icon: BookOpen },
  ];

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {/* Sidebar Desktop */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : 256 }}
        className="border-r border-[var(--border-subtle)] bg-[var(--color-card)] flex-col hidden md:flex shrink-0 relative z-20"
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-background border border-[var(--border-subtle)] rounded-full p-1 text-foreground/50 hover:text-primary hover:border-primary transition-colors z-30"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-center min-h-[89px]">
          <Link href="/">
            <div className="relative cursor-pointer opacity-90 hover:opacity-100 transition-opacity flex items-center justify-center">
              <AnimatePresence mode="wait">
                {!isCollapsed ? (
                  <motion.div key="logo-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-32 h-10 relative">
                    <Image src="/opt/logo-branca.webp" alt="Agnaldo Gomes Studio" fill className="object-contain drop-shadow-sm" priority />
                  </motion.div>
                ) : (
                  <motion.div key="logo-icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-10 h-10 relative">
                    <Image src="/opt/logo-branca.webp" alt="Agnaldo Gomes Studio" fill className="object-contain drop-shadow-sm" priority />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Link>
        </div>

        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
          <Link href="/">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground/50 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors">
              <ArrowLeft size={14} />
              {!isCollapsed && <span>Voltar pro Site</span>}
            </button>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                  }`}
                  title={isCollapsed ? link.label : undefined}
                >
                  <Icon size={20} className="shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden"
                      >
                        {link.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-[var(--border-subtle)] flex justify-center">
           <AdminUserButton isCollapsed={isCollapsed} />
        </div>
        {!isCollapsed && (
          <div className="px-4 pb-4 text-center">
            <p className="text-[10px] text-foreground/30">Desenvolvido por <span className="font-semibold text-foreground/40">Vertex Consulting</span></p>
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--color-card)] relative z-50">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 -ml-1 text-foreground/70 hover:text-foreground">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link href="/">
              <div className="w-24 h-8 relative cursor-pointer">
                <Image 
                  src="/opt/logo-branca.webp" 
                  alt="Agnaldo Gomes Studio" 
                  fill 
                  className="object-contain drop-shadow-md" 
                />
              </div>
            </Link>
          </div>
          <div className="w-10">
            <AdminUserButton isCollapsed={true} />
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-[var(--border-subtle)] bg-[var(--color-card)] overflow-hidden shadow-lg z-40 relative"
            >
              <nav className="p-4 space-y-2">
                <Link href="/">
                  <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground">
                    <ArrowLeft size={20} className="shrink-0" />
                    Voltar pro Site
                  </div>
                </Link>
                {links.map((link) => {
                  const Icon = link.icon;
                  const active = pathname === link.href;
                  return (
                    <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <div className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                        active ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                      }`}>
                        <Icon size={20} className="shrink-0" />
                        {link.label}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
