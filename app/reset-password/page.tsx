'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const type = searchParams.get('type');
    const token = searchParams.get('token');

    if (type === 'recovery' && token) {
      setLoading(false);
    } else if (type === 'recovery') {
      // Recovery sem token: esperar um pouco ou redirecionar
      // O Supabase pode redirecionar sem token em alguns casos
      setMessage(' Aguarde enquanto redirecionamos para a página de login...');
      setLoading(false);
      setTimeout(() => {
        router.replace('/login');
      }, 2000);
    } else {
      router.replace('/login');
    }
  }, [searchParams, router]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('As senhas não conferem.');
      return;
    }

    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: form.password,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setMessage('Senha alterada com sucesso. Redirecionando para o login...');
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 2500);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#B8860B]/20 mb-4">
            <svg className="w-6 h-6 text-[#B8860B] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.5 0 4 1.5 4 3.5v8z" />
            </svg>
          </div>
          <p className="text-[#0A0A0A]/60 text-sm">Verificando credencial de reset...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Senha alterada!</h1>
          <p className="text-[#0A0A0A]/60 mt-2">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-[#B8860B]/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#B8860B] mb-4">
              <svg className="w-7 h-7 text-[#0A0A0A]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#0A0A0A]">Nova senha</h1>
            <p className="text-[#0A0A0A]/60 text-sm mt-1">
              Insira sua nova senha abaixo.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-xl bg-[#B8860B]/10 border border-[#B8860B]/20 text-[#B8860B] text-sm mb-4">
              {message}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0A0A0A]/80 mb-1.5">
                Nova senha
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#0A0A0A]/20 text-[#0A0A0A] placeholder:text-[#0A0A0A]/30 focus:outline-none focus:border-[#B8860B] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0A0A0A]/80 mb-1.5">
                Confirmar senha
              </label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A]/50 border border-[#0A0A0A]/20 text-[#0A0A0A] placeholder:text-[#0A0A0A]/30 focus:outline-none focus:border-[#B8860B] transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#B8860B] text-[#0A0A0A] font-semibold hover:bg-[#B8860B]/90 transition-colors"
            >
              Alterar senha
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-[#B8860B] hover:text-[#B8860B]/80 transition-colors">
              ← Voltar ao login
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[#0A0A0A]/40 mt-6">
          © 2026 Gestão AG — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
