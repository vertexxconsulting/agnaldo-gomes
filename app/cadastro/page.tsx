'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/Button';
import { CardGlass } from '@/components/CardGlass';
import { SectionTitle } from '@/components/SectionTitle';
import { supabase } from '@/lib/supabase';
export default function CadastroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const senhaMensagens = {
    obrigatoria: 'Senha é obrigatória.',
    minimo: 'A senha deve ter pelo menos 6 caracteres.',
    confirmacaoObrigatoria: 'Confirmação de senha é obrigatória.',
    naoConferem: 'As senhas não coincidem.',
  };

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nome completo é obrigatório.';
    } else if (formData.fullName.trim().split(' ').length < 2) {
      newErrors.fullName = 'Informe nome e sobrenome.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido.';
    }

    if (formData.phone && !/^\+?\d[\d\s()-]{7,}$/.test(formData.phone)) {
      newErrors.phone = 'Telefone inválido.';
    }

    if (!formData.password) {
      newErrors.password = senhaMensagens.obrigatoria;
    } else if (formData.password.length < 6) {
      newErrors.password = senhaMensagens.minimo;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = senhaMensagens.confirmacaoObrigatoria;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = senhaMensagens.naoConferem;
    }

    return newErrors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpa o erro do campo sendo editado
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);

    // Registro real no Supabase
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          phone: formData.phone,
          role: 'aluno',
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrors({ form: error.message });
      return;
    }

    if (data.user) {
      // Salva dados complementares no localStorage para uso no perfil
      localStorage.setItem('ag-user', JSON.stringify({
        email: formData.email,
        nome: formData.fullName,
        telefone: formData.phone,
        created: new Date().toISOString(),
      }));
      setSuccess(true);

      // Redireciona para perfil após 2 segundos
      setTimeout(() => {
        router.push('/perfil');
      }, 2000);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <CardGlass className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center">
            <UserPlus size={32} className="text-[var(--color-success)]" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Conta criada!</h2>
          <p className="text-foreground/70 mb-4">
            Redirecionando para o seu perfil...
          </p>
          <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardGlass>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <CardGlass className="w-full max-w-md">
        <SectionTitle title="Criar Conta" subtitle="Junte-se ao Studio" align="center" />

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {errors._general && (
            <div className="rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 p-3">
              <p className="text-[var(--color-danger)] text-sm" role="alert">
                {errors._general}
              </p>
            </div>
          )}

          {/* Nome completo */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Nome completo
            </label>
            <input
              id="fullName"
              type="text"
              name="fullName"
              placeholder="Seu nome e sobrenome"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-[var(--color-card)] border border-white/10 rounded-lg text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              aria-label="Nome completo"
              aria-invalid={!!errors.fullName}
            />
            {errors.fullName && (
              <p className="text-[var(--color-danger)] text-xs mt-1.5" role="alert">{errors.fullName}</p>
            )}
          </div>

          {/* E-mail */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground/80 mb-1.5">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-[var(--color-card)] border border-white/10 rounded-lg text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              aria-label="E-mail"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-[var(--color-danger)] text-xs mt-1.5" role="alert">{errors.email}</p>
            )}
          </div>

          {/* Telefone (opcional) */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Telefone <span className="text-foreground/40">(opcional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder="+55 (11) 99999-9999"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-[var(--color-card)] border border-white/10 rounded-lg text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              aria-label="Telefone"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-[var(--color-danger)] text-xs mt-1.5" role="alert">{errors.phone}</p>
            )}
          </div>

          {/* Senha */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 pr-12 bg-[var(--color-card)] border border-white/10 rounded-lg text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                aria-label="Senha"
                aria-invalid={!!errors.password}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
                aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[var(--color-danger)] text-xs mt-1.5" role="alert">{errors.password}</p>
            )}
          </div>

          {/* Confirmar senha */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground/80 mb-1.5">
              Confirmar senha
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Repita a senha"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 pr-12 bg-[var(--color-card)] border border-white/10 rounded-lg text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                aria-label="Confirmar senha"
                aria-invalid={!!errors.confirmPassword}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
                aria-label={showConfirmPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[var(--color-danger)] text-xs mt-1.5" role="alert">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                Registrando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus size={18} />
                Cadastrar
              </span>
            )}
          </Button>

          {/* Links */}
          <div className="text-center pt-2">
            <p className="text-sm text-foreground/60">
              Já tem conta?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Fazer login
              </Link>
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-foreground/40 hover:text-foreground/70 transition-colors"
            >
              <ArrowLeft size={14} />
              Voltar ao site
            </Link>
          </div>
        </form>
      </CardGlass>
    </div>
  );
}
