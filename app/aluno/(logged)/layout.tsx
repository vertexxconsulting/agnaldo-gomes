'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { User, LogOut, FileText, PlayCircle, Settings, Menu, BookOpen } from 'lucide-react';
import { useState } from 'react';

export default function AlunoLoggedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Início', href: '/aluno/dashboard', icon: PlayCircle },
    { name: 'Meus Cursos', href: '/aluno/cursos', icon: PlayCircle },
    { name: 'Catálogo', href: '/aluno/catalogo', icon: PlayCircle },
    { name: 'Comunidade', href: '/aluno/comunidade', icon: PlayCircle },
    { name: 'Certificados', href: '/aluno/certificados', icon: FileText },
    { name: 'Ajuda / Tutorial', href: '/aluno/tutorial', icon: BookOpen },
  ];

  return (
    <div className="dark bg-[#0a0a0a] text-white min-h-screen font-sans selection:bg-primary/30 selection:text-white">
      {/* Header Estilo Netflix */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-50 transition-all duration-300">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          
          <div className="flex items-center gap-10">
            {/* Logo */}
            <Link href="/aluno/dashboard" className="flex items-center gap-3">
              <div className="w-14 h-14 relative">
                <Image src="/opt/logo-branca.webp" alt="Studio Logo" fill className="object-contain" />
              </div>
              <span className="text-2xl font-serif font-bold text-primary tracking-wider">
                Academy
              </span>
            </Link>

            {/* Nav Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-white/80 ${
                    pathname === link.href ? 'text-white' : 'text-white/50'
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
                <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center border border-white/20 overflow-hidden">
                  <User size={20} className="text-white/70" />
                </div>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#141414] border border-white/10 rounded-md shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
                <Link href="/aluno/perfil" className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5">
                  <Settings size={16} /> Minha Conta
                </Link>
                <div className="h-px bg-white/10 my-2" />
                <Link href="/aluno" className="flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10">
                  <LogOut size={16} /> Sair
                </Link>
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
          <div className="md:hidden absolute top-20 left-0 right-0 bg-[#0a0a0a] border-b border-white/10 p-4 flex flex-col gap-4">
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
