'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import Image from 'next/image';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Verifica se o usuário tem uma sessão válida (o Supabase client automaticamente
  // processa o token da URL '#access_token=...&type=recovery')
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (!session) {
        setStatus('error');
        setErrorMessage('Sessão de recuperação inválida ou expirada. Solicite um novo link.');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error');
      setErrorMessage('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setStatus('error');
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
      } else {
        setStatus('success');
        // Desloga o usuário para ele fazer login com a nova senha
        await supabase.auth.signOut();
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
          <div className="p-4 rounded-2xl bg-gradient-to-b from-gold/20 to-gold/5 border border-gold/30">
            <Image src="/logo-branca.png" alt="Logo" width={100} height={100} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-foreground mb-2">Criar nova senha</h1>
        
        {status === 'success' ? (
          <div className="text-center mt-6">
            <div className="flex justify-center mb-4">
              <CheckCircle className="text-green-500 w-16 h-16" />
            </div>
            <p className="text-foreground mb-6 text-sm">
              Sua senha foi atualizada com sucesso! Você já pode fazer login.
            </p>
            <Button onClick={() => router.push('/academy/login')} variant="primary" className="w-full">
              Fazer Login
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-center text-white/70 mb-8">
              Digite e confirme sua nova senha abaixo.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-medium mb-1.5 text-white/90">
                  Nova Senha
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-3 bg-black/25 border border-white/15 rounded-xl text-sm text-foreground placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-gold transition-all focus:bg-black/40 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-10 text-white/40 hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-1.5 text-white/90">
                  Confirmar Nova Senha
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-3 bg-black/25 border border-white/15 rounded-xl text-sm text-foreground placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-gold transition-all focus:bg-black/40 pr-12"
                />
              </div>

              {status === 'error' && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-200 rounded-lg text-sm text-center font-medium">
                  {errorMessage}
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full mt-4" disabled={isSubmitting}>
                {isSubmitting ? 'Atualizando...' : 'Atualizar Senha'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
