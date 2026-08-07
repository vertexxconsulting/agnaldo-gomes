'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, GraduationCap, PlayCircle, Settings, Users, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminUserButton } from '@/components/AdminUserButton';

export default function AdminAcademyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const links = [
    { href: '/admin-academy', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin-academy/cursos', label: 'Gestão de Cursos', icon: PlayCircle },
    { href: '/admin-academy/alunos', label: 'Gestão de Alunos', icon: GraduationCap },
    { href: '/admin-academy/comunidade', label: 'Comunidade', icon: Users },
    { href: '/admin-academy/configuracoes', label: 'Configurações', icon: Settings },
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
                  <motion.div key="logo-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <div className="w-8 h-8 relative">
                      <Image src="/opt/logo-branca.webp" alt="Agnaldo Gomes Studio" fill className="object-contain" priority />
                    </div>
                    <span className="text-xl font-serif font-bold text-primary tracking-wider">
                      Academy
                    </span>
                  </motion.div>
                ) : (
                  <motion.div key="logo-icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-8 h-8 relative">
                    <Image src="/opt/logo-branca.webp" alt="Agnaldo Gomes Studio" fill className="object-contain" priority />
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
            settingsHref="/admin-academy/configuracao"
            logoutHref="/academy/login"
          />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--background)]">
        {/* Header Mobile */}
        <header className="md:hidden h-16 border-b border-[var(--border-subtle)] bg-[var(--color-card)] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 relative">
              <Image src="/opt/logo-branca.webp" alt="Agnaldo Gomes Studio" fill className="object-contain" />
            </div>
            <span className="text-lg font-serif font-bold text-primary tracking-wider">
              Academy
            </span>
          </div>
          
          <select 
            className="bg-background border border-[var(--border-subtle)] text-foreground text-sm rounded-lg px-2 py-1 outline-none focus:border-primary"
            value={pathname}
            onChange={(e) => window.location.href = e.target.value}
          >
            {links.map(l => <option key={l.href} value={l.href}>{l.label}</option>)}
          </select>
        </header>

        {children}
      </main>
    </div>
  );
}
