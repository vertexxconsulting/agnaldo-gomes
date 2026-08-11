'use client';

import { useState } from 'react';
import { motion, type Transition } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

/**
 * Variants inspirados no Clerk SignIn de https://examples.motion.dev/react/clerk-sign-in
 * Título: blur 10px → 0px (TEXT_VARIANTS)
 * Form: container com stagger de entrada
 * Transição spring: { type: "spring", bounce: 0.3, visualDuration: 0.4 }
 */
const TEXT_VARIANTS = {
  initial: { opacity: 0, filter: 'blur(10px)', y: -10 },
  animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
  exit: { opacity: 0, filter: 'blur(10px)', y: 10 },
};

const ITEM_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const SPRING: Transition = { type: 'spring', bounce: 0.3, visualDuration: 0.4 };

interface SplitLoginProps {
  logoSrc: string;
  sideBg: 'light' | 'dark';
  title: string;
  subtitle?: string;
  redirectTo: string;
  formTitle?: string;
  formSubtitle?: string;
  cta?: string;
  registerHref?: string;
  registerLabel?: string;
  hint?: string;
}

/**
 * Tela de login dividida: painel de marca (logo) à esquerda + formulário animado à direita.
 * Realiza autenticação no Supabase via supabase.auth.signInWithPassword
 */
export function SplitLogin({
  logoSrc,
  sideBg,
  title,
  subtitle,
  redirectTo,
  formTitle = 'Acesse sua conta',
  formSubtitle,
  cta = 'Entrar',
  registerHref,
  registerLabel = 'Criar conta',
  hint = 'Modo teste: use qualquer e-mail válido e senha com 6+ caracteres.',
}: SplitLoginProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) {
      newErrors.email = 'O e-mail é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido.';
    }
    if (!formData.password) {
      newErrors.password = 'A senha é obrigatória.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres.';
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrors({ form: 'E-mail ou senha incorretos.' });
      return;
    }

    if (data.session) {
      localStorage.setItem('ag-sessao', JSON.stringify({ email: formData.email, sistema: redirectTo, em: new Date().toISOString() }));
      router.push(redirectTo);
    }
  };

  const darkSide = sideBg === 'dark';

  return (
    <motion.div
      className="min-h-screen flex items-stretch"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={SPRING}
    >
      {/* Painel esquerdo — marca/logo */}
      <motion.div
        className={`hidden lg:flex w-1/2 flex-col items-center justify-center gap-8 p-12 ${
          darkSide ? 'bg-[#0a0a0c]' : 'bg-white'
        }`}
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={SPRING}
      >
        <div className={darkSide ? 'p-10 rounded-3xl bg-white/5 border border-primary/20' : ''}>
          <Image
            src={logoSrc}
            alt={title}
            width={220}
            height={220}
            priority
            className="rounded-full"
          />
        </div>
        <div>
          <motion.h1
            className={`text-3xl font-bold tracking-tight text-center ${darkSide ? 'text-white' : 'text-gray-900'}`}
            variants={TEXT_VARIANTS}
            initial="initial"
            animate="animate"
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              className={`text-lg max-w-md text-center ${darkSide ? 'text-white/60' : 'text-gray-500'}`}
              variants={TEXT_VARIANTS}
              initial="initial"
              animate="animate"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </motion.div>

      {/* Painel direito — formulário animado */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-20 bg-background">
        <motion.div
          className="w-full max-w-md"
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Logo visível também no mobile */}
          <motion.div
            className="lg:hidden flex flex-col items-center gap-4 mb-10"
            variants={ITEM_VARIANTS}
          >
            <Image src={logoSrc} alt={title} width={100} height={100} className="rounded-full" />
            <motion.h1
              className="text-2xl font-bold text-center text-foreground"
              variants={TEXT_VARIANTS}
            >
              {title}
            </motion.h1>
          </motion.div>

          <motion.h2 className="text-3xl font-bold text-foreground mb-1" variants={TEXT_VARIANTS}>
            {formTitle}
          </motion.h2>
          {formSubtitle && (
            <motion.p className="text-foreground/60 text-sm mb-6" variants={ITEM_VARIANTS}>
              {formSubtitle}
            </motion.p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <motion.div variants={ITEM_VARIANTS}>
              <label htmlFor="split-email" className="block text-sm font-medium text-foreground/80 mb-1.5">
                E-mail
              </label>
              <input
                id="split-email"
                type="email"
                name="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--color-card)] border border-white/10 rounded-lg text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                aria-label="E-mail"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-[var(--color-danger)] text-xs mt-1.5" role="alert">{errors.email}</p>}
            </motion.div>

            <motion.div variants={ITEM_VARIANTS}>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="split-password" className="block text-sm font-medium text-foreground/80">
                  Senha
                </label>
                <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  id="split-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Sua senha"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 bg-[var(--color-card)] border border-white/10 rounded-lg text-foreground text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  aria-label="Senha"
                  aria-invalid={!!errors.password}
                  autoComplete="current-password"
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
              {errors.password && <p className="text-[var(--color-danger)] text-xs mt-1.5" role="alert">{errors.password}</p>}
            </motion.div>
            
            {/* Exibição de Erro Geral */}
            {errors.form && (
              <motion.div variants={ITEM_VARIANTS} className="p-3 mb-6 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center font-medium">
                {errors.form}
              </motion.div>
            )}

            <motion.div variants={ITEM_VARIANTS}>
              <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn size={18} /> {cta}
                  </span>
                )}
              </Button>
            </motion.div>

            {registerHref && (
              <motion.p className="text-center text-sm text-foreground/60 pt-1" variants={ITEM_VARIANTS}>
                Não tem conta?{' '}
                <Link href={registerHref} className="text-primary hover:text-primary/80 font-medium transition-colors">
                  {registerLabel}
                </Link>
              </motion.p>
            )}

            <motion.div className="text-center" variants={ITEM_VARIANTS}>
              <Link href="/" className="inline-flex items-center gap-1 text-sm text-foreground/40 hover:text-foreground/70 transition-colors">
                <ArrowLeft size={14} /> Voltar ao site
              </Link>
            </motion.div>

            <motion.p className="text-center text-xs text-foreground/40 pt-2 leading-relaxed" variants={ITEM_VARIANTS}>
              {hint}
            </motion.p>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
