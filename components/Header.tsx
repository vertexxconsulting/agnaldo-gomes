'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from './Button';

const navLinks = [
  { name: 'Início', href: '/' },
  { name: 'Studio', href: '/studio' },
  { name: 'Academy', href: '/academy' },
  { name: 'Loja', href: '/loja' },
  { name: 'Sobre', href: '/sobre' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isDarkPage = pathname === '/academy' || pathname?.startsWith('/academy') || pathname === '/' || pathname === '/studio' || pathname === '/sobre';
  const isDarkHeader = isDarkPage;

  return (
    <header className="absolute top-0 left-0 right-0 z-50 py-2.5 bg-transparent">
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="Agnaldo Gomes — Início">
          <Image
            src="/logo-agnaldo.png"
            alt="Logo Agnaldo Gomes"
            width={280}
            height={80}
            className={cn(
              "object-contain h-20 w-auto transition-all duration-300",
              isDarkHeader ? "invert brightness-0" : "mix-blend-multiply dark:mix-blend-screen"
            )}
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "text-[12px] font-medium transition-colors uppercase tracking-[0.14em]",
                  isActive
                    ? "text-gold font-bold underline underline-offset-4 decoration-gold/60"
                    : (isDarkHeader ? "text-white hover:text-gold" : "text-foreground/75 hover:text-primary")
                )}
              >
                {link.name}
              </Link>
            );
          })}
          <Link href="/agendamento">
            {isDarkHeader ? (
              <button className="uppercase tracking-[0.14em] text-[11px] px-3.5 py-1.5 border border-gold/70 text-gold hover:bg-gold/10 rounded-md font-bold transition-all cursor-pointer">
                Agendar meu Horário
              </button>
            ) : (
              <Button variant="outline" size="sm" className="uppercase tracking-[0.14em] text-[11px] px-3.5 py-1.5">
                Agendar meu Horário
              </Button>
            )}
          </Link>
          <Link 
            href="/academy/login" 
            className={cn(
              "text-[12px] font-medium transition-colors",
              isDarkHeader ? "text-white/80 hover:text-white" : "text-foreground/75 hover:text-primary"
            )}
          >
            Área do Aluno
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button
          className={cn("md:hidden p-2 rounded-lg transition-colors", isDarkHeader ? "text-white hover:bg-white/10" : "text-foreground hover:bg-black/5")}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-primary/20 py-6 px-6 flex flex-col gap-5 shadow-2xl z-50">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-lg font-medium transition-colors py-1",
                  isActive ? "text-gold font-bold" : "text-white/90 hover:text-primary"
                )}
              >
                {link.name}
              </Link>
            );
          })}
          <Link href="/agendamento" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="outline" className="w-full mt-2 uppercase tracking-widest text-sm py-3 border-gold/60 text-gold hover:bg-gold/10">
              Agendar meu Horário
            </Button>
          </Link>
          <Link 
            href="/academy/login" 
            onClick={() => setMobileMenuOpen(false)} 
            className="text-base font-medium text-white/70 hover:text-gold transition-colors pt-2 border-t border-white/10"
          >
            Área do Aluno
          </Link>
        </div>
      )}
    </header>
  );
}
