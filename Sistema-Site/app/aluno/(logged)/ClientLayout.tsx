'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { User, LogOut, FileText, PlayCircle, Settings, Menu, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/academy/login');
  };

  const navLinks = [
    { name: 'Início', href: '/aluno/dashboard', icon: PlayCircle },
    { name: 'Meus Cursos', href: '/aluno/cursos', icon: PlayCircle },
    { name: 'Catálogo', href: '/aluno/catalogo', icon: PlayCircle },
    { name: 'Comunidade', href: '/aluno/comunidade', icon: PlayCircle },
    { name: 'Certificados', href: '/aluno/certificados', icon: FileText },
    { name: 'Ajuda / Tutorial', href: '/aluno/tutorial', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen academy-dark bg-background text-foreground font-sans selection:bg-gold/30 selection:text-foreground">
      {/* Header Estilo Netflix */}
      <header className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-50 transition-all duration-300">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">

          <div className="flex items-center gap-10">
            {/* Logo */}
            <Link href="/aluno/dashboard" className="flex items-center gap-3 group">
              <div className="w-12 h-12 relative rounded-lg overflow-hidden border border-gold/20 shadow-md group-hover:border-gold/50 transition-colors">
                <Image
                  src="/icon-512x512.png"
                  alt="Agnaldo Gomes Academy"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <span className="text-2xl font-serif font-bold text-gold tracking-wider">
                Academy
              </span>
            </Link>

            {/* Nav Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-white ${
                    pathname === link.href ? 'text-white font-bold drop-shadow-md' : 'text-white/70'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            {/* Perfil Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center border border-gold/20 overflow-hidden">
                  <User size={20} className="text-white" />
                </div>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1d] border border-gold/20 rounded-md shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
                <Link href="/aluno/perfil" className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5">
                  <Settings size={16} /> Minha Conta
                </Link>
                <div className="h-px bg-gold/20 my-2" />
                <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
                  <LogOut size={16} /> Sair
                </button>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden absolute top-20 left-0 right-0 bg-[#0f0f11] border-b border-gold/20 p-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-white/70 hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Conteúdo Principal */}
      <main className="pt-20 pb-20">
        {children}
      </main>
    </div>
  );
}
