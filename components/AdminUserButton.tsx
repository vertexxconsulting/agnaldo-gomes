'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function AdminUserButton({ 
  isCollapsed,
  profileHref = "/admin/perfil",
  settingsHref = "/admin/sistema",
  logoutHref = "/login"
}: { 
  isCollapsed?: boolean;
  profileHref?: string;
  settingsHref?: string;
  logoutHref?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
    // Remove sessão do localstorage (usado em modo teste)
    localStorage.removeItem('ag-sessao');
    
    // Redireciona com hard reload para limpar estados em memória e forçar o middleware
    window.location.href = logoutHref;
  };

  return (
    <div className="relative z-50 flex items-center justify-center w-full" ref={containerRef}>
      {!isOpen ? (
        <motion.button
          layoutId="user-button-container"
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-3 transition-colors rounded-full ${
            isCollapsed 
              ? 'p-2 bg-primary/10 hover:bg-primary/20 text-primary' 
              : 'p-2 w-full hover:bg-foreground/5'
          }`}
          style={{ borderRadius: isCollapsed ? 9999 : 12 }}
        >
          <motion.div 
            layoutId="user-avatar"
            className="w-10 h-10 rounded-full bg-primary/20 text-primary flex flex-shrink-0 items-center justify-center font-bold"
          >
            AG
          </motion.div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-start overflow-hidden whitespace-nowrap"
            >
              <span className="text-sm font-medium text-foreground">Admin</span>
              <span className="text-xs text-foreground/50">admin@agnaldo.com</span>
            </motion.div>
          )}
        </motion.button>
      ) : (
        <AnimatePresence>
          <motion.div
            layoutId="user-button-container"
            className="absolute bottom-0 left-0 w-64 bg-background border border-[var(--border-subtle)] rounded-xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          >
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3 relative">
              <motion.div 
                layoutId="user-avatar"
                className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold"
              >
                AG
              </motion.div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">Agnaldo Gomes</span>
                <span className="text-xs text-foreground/50">Administrador</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-foreground/50 hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-2">
              <Link href={profileHref} onClick={() => setIsOpen(false)}>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer">
                  <User size={16} />
                  Meu Perfil
                </div>
              </Link>
              <Link href={settingsHref} onClick={() => setIsOpen(false)}>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer">
                  <Settings size={16} />
                  Configurações
                </div>
              </Link>
            </div>
            
              <div className="p-2 border-t border-[var(--border-subtle)]">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer font-medium w-full text-left"
              >
                <LogOut size={16} />
                Sair da Conta
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
