'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

const navLinks = [
  { name: 'Início', href: '/' },
  { name: 'Studio', href: '/studio' },
  { name: 'Academy', href: '/academy' },
];

// Rotas dos sistemas — acessíveis apenas por URL direta (fora do menu público)
export const sistemaRotas = ['/agendamento', '/aluno', '/admin'];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-3',
        isScrolled ? 'glass' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="Agnaldo Gomes — Início">
          <Image
            src="/opt/logo-branca.webp"
            alt="Logo Agnaldo Gomes"
            width={56}
            height={56}
            className="rounded-full ring-2 ring-primary/40 ring-offset-2 ring-offset-background shadow-lg"
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-widest"
            >
              {link.name}
            </Link>
          ))}
          <Link href="/agendamento">
            <Button variant="outline" size="sm" className="uppercase tracking-widest text-xs">
              Agendar meu Horário
            </Button>
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
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
        </div>
      )}
    </header>
  );
}
