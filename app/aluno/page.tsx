'use client';

import { useState } from 'react';
import { LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/Button';
import { Reveal } from '@/components/motion';
import Link from 'next/link';
import Image from 'next/image';

export default function AlunoPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen w-full flex">
      {/* Lado Esquerdo - Formulário */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-background relative z-10">
        <Link href="/" className="absolute top-8 left-8 sm:top-12 sm:left-12 text-foreground/50 hover:text-primary transition-colors flex items-center gap-2 text-sm font-medium">
          <ArrowLeft size={16} /> Voltar ao site
        </Link>

        <Reveal className="w-full max-w-sm mx-auto">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Área do <span className="text-primary">Aluno</span>
            </h1>
            <p className="text-foreground/60 text-sm">
              Bem-vindo de volta à Academy. Faça login para acessar suas aulas e certificados.
            </p>
          </div>

          <form className="flex flex-col gap-5">
            <div>
              <label htmlFor="aluno-email" className="block text-sm font-medium text-foreground/80 mb-2">
                E-mail
              </label>
              <input
                id="aluno-email"
                type="email"
                className="w-full px-4 py-3 bg-[var(--color-card)] border border-white/5 rounded-xl text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors shadow-inner"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="aluno-senha" className="block text-sm font-medium text-foreground/80">
                  Senha
                </label>
                <Link href="/contato" className="text-xs text-primary hover:text-primary-hover transition-colors">
                  Esqueceu a senha?
                </Link>
              </div>
              <input
                id="aluno-senha"
                type="password"
                className="w-full px-4 py-3 bg-[var(--color-card)] border border-white/5 rounded-xl text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors shadow-inner"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <Link href="/aluno/dashboard" className="w-full mt-4">
              <Button type="button" variant="primary" size="lg" className="w-full">
                <LogIn className="mr-2" size={18} /> Entrar
              </Button>
            </Link>

            <p className="text-sm text-foreground/50 text-center mt-6">
              Ainda não é aluno?{' '}
              <Link href="/academy" className="text-primary font-medium hover:underline">
                Conheça os cursos
              </Link>
            </p>
          </form>
        </Reveal>
      </div>

      {/* Lado Direito - Imagem de Destaque */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[var(--color-card)] border-l border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent z-10 w-24" />
        <Image
          src="/perfil.jpg"
          alt="Agnaldo Gomes Academy"
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent z-10" />
        
        <div className="absolute bottom-16 left-16 right-16 z-20">
          <Reveal>
            <div className="glass p-8 rounded-2xl border-l-4 border-primary">
              <p className="text-lg font-medium text-foreground italic leading-relaxed mb-4">
                "A técnica refinada é o que separa um bom profissional de um artista de excelência. Bem-vindo ao próximo nível da sua carreira."
              </p>
              <div>
                <h4 className="font-bold text-primary">Agnaldo Gomes</h4>
                <span className="text-xs text-foreground/60 uppercase tracking-widest">Master Hair Stylist</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}