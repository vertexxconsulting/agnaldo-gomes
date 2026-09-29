'use client';

import { useState, useEffect } from 'react';
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
  { name: 'Sobre', href: '/sobre' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  const isDarkPage = pathname === '/academy' || pathname === '/' || pathname === '/studio' || pathname === '/sobre';
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
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "text-[12px] font-medium transition-colors uppercase tracking-[0.14em]",
                isDarkHeader ? "text-white hover:text-gold" : "text-foreground/75 hover:text-primary"
              )}
            >
              {link.name}
            </Link>
          ))}
          <Link href="/agendamento">
            {isDarkHeader ? (
              <button className="uppercase tracking-[0.14em] text-[11px] px-3.5 py-1.5 border border-gold/70 text-gold hover:bg-gold/10 rounded-md font-bold transition-all">
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
          className={cn("md:hidden", isDarkHeader ? "text-white" : "text-foreground")}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-lg border-b border-primary/20 py-6 px-6 flex flex-col gap-6 shadow-2xl">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-foreground hover:text-primary transition-colors"
            >
              {link.name}
            </Link>
          ))}
          <Link href="/agendamento" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="outline" className="w-full mt-4 uppercase tracking-widest text-sm">
              Agendar meu Horário
            </Button>
          </Link>
          <Link href="/academy/login" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-foreground hover:text-primary transition-colors">
            Área do Aluno
          </Link>
        </div>
      )}
    </header>
  );
}
