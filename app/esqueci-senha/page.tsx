'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/atualizar-senha`,
      });

      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
      } else {
        setStatus('success');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage('Ocorreu um erro inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 sm:p-6 md:p-10 bg-background">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/Metodo-AG.webp)' }} />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="w-full max-w-md relative z-10 bg-black/30 backdrop-blur-xl border border-white/10 p-8 sm:p-12 rounded-[2rem] shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
            <Image src="/icon-192x192.png" alt="Logo" width={100} height={100} className="object-cover" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-foreground mb-2">Esqueceu sua senha?</h1>
        
        {status === 'success' ? (
          <div className="text-center">
            <p className="text-white/80 mb-6 text-sm leading-relaxed">
              Enviamos um link de recuperação para <strong className="text-foreground">{email}</strong>. Por favor, verifique sua caixa de entrada e a pasta de spam.
            </p>
            <Link href="/" className="inline-flex items-center justify-center w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-foreground rounded-xl text-sm font-medium transition-colors">
              Voltar ao início
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-center text-white/70 mb-8">
              Digite o e-mail associado à sua conta e enviaremos um link para redefinir sua senha.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-white/90">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 bg-black/25 border border-white/15 rounded-xl text-sm text-foreground placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-gold transition-all focus:bg-black/40"
                />
              </div>

              {status === 'error' && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-200 rounded-lg text-sm text-center font-medium">
                  {errorMessage}
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting || !email}>
                {isSubmitting ? 'Enviando...' : (
                  <span className="flex items-center justify-center gap-2">
                    <Mail size={18} /> Enviar link
                  </span>
                )}
              </Button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-foreground transition-colors hover:underline"
                >
                  <ArrowLeft size={16} /> Voltar para o login
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
