'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Users, Scissors, UserCircle, LogOut, Database, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminUserButton } from '@/components/AdminUserButton';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const links = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/agenda', label: 'Agenda', icon: CalendarDays },
    { href: '/admin/clientes', label: 'Clientes (CRM)', icon: Users },
    { href: '/admin/profissionais', label: 'Profissionais', icon: UserCircle },
    { href: '/admin/servicos', label: 'Serviços', icon: Scissors },
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
                  <motion.div key="logo-icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif font-bold text-lg">
                    AG
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--color-card)]">
          <div className="w-24 h-8 relative cursor-pointer">
            <Image 
              src="/opt/logo-branca.webp" 
              alt="Agnaldo Gomes Studio" 
              fill 
              className="object-contain drop-shadow-md" 
            />
          </div>
          <select 
            className="bg-transparent border border-[var(--border-subtle)] rounded px-2 py-1 text-sm text-foreground focus:outline-none"
            value={pathname}
            onChange={(e) => window.location.href = e.target.value}
          >
            {links.map(l => <option key={l.href} value={l.href}>{l.label}</option>)}
          </select>
        </header>

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
