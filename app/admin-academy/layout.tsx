'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, GraduationCap, PlayCircle, Settings, Users, ArrowLeft, ChevronLeft, ChevronRight, Menu, X, BookOpen, Award, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminUserButton } from '@/components/AdminUserButton';

export default function AdminAcademyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { href: '/hub', label: 'Command Center', icon: Command, hub: true },
    { href: '/admin-academy', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin-academy/cursos', label: 'Gestão de Cursos', icon: PlayCircle },
    { href: '/admin-academy/alunos', label: 'Gestão de Alunos', icon: GraduationCap },
    { href: '/admin-academy/comunidade', label: 'Comunidade', icon: Users },
    { href: '/admin-academy/certificados', label: 'Certificados', icon: Award },
    { href: '/admin-academy/configuracoes', label: 'Configurações', icon: Settings },
    { href: '/admin-academy/tutorial', label: 'Ajuda / Tutorial', icon: BookOpen },
  ];

  // Página de login não usa sidebar
  if (pathname === '/admin-academy/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
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
                  <motion.div key="logo-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <div className="w-8 h-8 relative">
                      <Image src="/logo-agnaldo.png" alt="Agnaldo Gomes Studio" fill className="object-contain" priority />
                    </div>
                    <span className="text-xl font-serif font-bold text-primary tracking-wider">
                      Academy
                    </span>
                  </motion.div>
                ) : (
                  <motion.div key="logo-icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-8 h-8 relative">
                    <Image src="/logo-agnaldo.png" alt="Agnaldo Gomes Studio" fill className="object-contain" priority />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Link>
        </div>

        <div className="py-2 border-b border-[var(--border-subtle)]">
          <Link href="/" className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            {!isCollapsed && <span>Voltar ao Site</span>}
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {links.map((link) => {
            const Icon = link.icon;
            // Para /admin-academy, a lógica de active é exata. Para o resto, usa startsWith
            const active = link.href === '/admin-academy' 
              ? pathname === '/admin-academy'
              : pathname.startsWith(link.href);

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
                  {!isCollapsed && link.hub && (
                    <span className="ml-auto text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/15 text-primary">Unificado</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-[var(--border-subtle)]">
          {/* Botão de Perfil */}
          <AdminUserButton
            isCollapsed={isCollapsed}
            profileHref="/admin-academy/perfil"
            settingsHref="/admin-academy/configuracoes"
            logoutHref="/admin-academy/login"
          />
        </div>
        {!isCollapsed && (
          <div className="px-4 pb-4 text-center">
            <p className="text-[10px] text-foreground/30">Desenvolvido por <span className="font-semibold text-foreground/40">Vertex Consulting</span></p>
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white relative">
        {/* Header Mobile */}
        <header className="md:hidden h-16 border-b border-[var(--border-subtle)] bg-[var(--color-card)] flex items-center justify-between px-4 shrink-0 relative z-50">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 -ml-1 text-foreground/70 hover:text-foreground">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link href="/">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 relative">
                  <Image src="/logo-agnaldo.png" alt="Agnaldo Gomes Studio" fill className="object-contain" />
                </div>
                <span className="text-lg font-serif font-bold text-primary tracking-wider">
                  Academy
                </span>
              </div>
            </Link>
          </div>
          <div className="w-10">
            <AdminUserButton
              isCollapsed={true}
              profileHref="/admin-academy/perfil"
              settingsHref="/admin-academy/configuracoes"
              logoutHref="/admin-academy/login"
            />
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-[var(--border-subtle)] bg-[var(--color-card)] overflow-hidden shadow-lg z-40 relative flex-shrink-0"
            >
              <nav className="p-4 space-y-2">
                <Link href="/">
                  <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground">
                    <ArrowLeft size={20} className="shrink-0" />
                    Voltar ao Site
                  </div>
                </Link>
                {links.map((link) => {
                  const Icon = link.icon;
                  const active = link.href === '/admin-academy' 
                    ? pathname === '/admin-academy'
                    : pathname.startsWith(link.href);
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

        {children}
      </main>
    </div>
  );
}
