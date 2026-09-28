'use client';

import { useState, useEffect } from 'react';
import { motion, type Transition } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { getUserRole, AREA_LABELS, ROLES, type Role } from '@/lib/auth';

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
  backHref?: string;
  backLabel?: string;
  titleClassName?: string;
  sideBgImage?: string;
  /** Papel exigido para entrar nesta área. Se o usuário não tiver esse papel, o acesso é negado. */
  requiredRole?: Role;
  /** Lista de papéis permitidos para entrar nesta área (alternativa a requiredRole). */
  allowedRoles?: Role[];
  /** Centraliza o card de login na tela, oculta a coluna da hero e aplica glassmorphism translúcido */
  centeredCard?: boolean;
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
  hint,
  backHref = '/',
  backLabel = 'Voltar ao site',
  titleClassName,
  sideBgImage,
  requiredRole,
  allowedRoles,
  centeredCard = false,
}: SplitLoginProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Se já houver sessão: redireciona para a área se o papel for o correto,
  // ou encerra a sessão se for de outra área (evita acesso cruzado).
  useEffect(() => {
    if (!requiredRole && !allowedRoles) return;
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      const role = getUserRole(data.user);
      const roleAllowed = requiredRole
        ? (role === requiredRole || role === ROLES.ADMIN)
        : (allowedRoles
            ? (allowedRoles.includes(role as Role) || role === ROLES.ADMIN)
            : false);
      if (roleAllowed) {
        router.replace(redirectTo);
      } else if (role) {
        supabase.auth.signOut();
      }
    });
  }, [requiredRole, allowedRoles, redirectTo, router]);

  const senhaMensagens = {
    obrigatoria: 'A senha é obrigatória.',
    minimo: 'A senha deve ter pelo menos 6 caracteres.',
  };

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) {
      newErrors.email = 'O e-mail é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido.';
    }
    if (!formData.password) {
      newErrors.password = senhaMensagens.obrigatoria;
    } else if (formData.password.length < 6) {
      newErrors.password = senhaMensagens.minimo;
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
    // Valida se a conta tem permissão para esta área (login dedicado)
    const role = getUserRole(data.user);
    const roleDenied = requiredRole
      ? (role !== requiredRole && role !== ROLES.ADMIN)
      : (allowedRoles
          ? (!allowedRoles.includes(role as Role) && role !== ROLES.ADMIN)
          : false);
    if (roleDenied) {
      await supabase.auth.signOut();
      setErrors({
        form: role
          ? `Acesso negado: esta conta pertence a area de ${AREA_LABELS[role]}. Use o login da sua area.`
          : 'Acesso negado: esta conta nao tem permissao para esta area. Contate o administrador.',
      });
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
      className={`min-h-screen relative overflow-hidden flex ${
        centeredCard
          ? 'items-center justify-center p-4 sm:p-6 md:p-10'
          : 'items-stretch'
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={SPRING}
    >
      {sideBgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${sideBgImage})` }}
          />
          <div
            className={`absolute inset-0 ${
              centeredCard
                ? 'bg-foreground/30'
                : 'bg-background/60 backdrop-blur-[2px]'
            }`}
          />
        </>
      )}
      {/* Painel esquerdo — marca/logo (oculto quando centralizado para não sobrepor o fundo) */}
      {!centeredCard && (
        <motion.div
          className={`hidden lg:flex w-1/2 flex-col items-center justify-center gap-8 p-12 relative overflow-hidden ${
            !sideBgImage && darkSide
              ? 'bg-gradient-to-br from-card-bg via-background to-gold/10 text-foreground'
              : !sideBgImage
              ? 'bg-white text-gray-900'
              : 'text-foreground bg-transparent' // If full bg image, background is on parent
          }`}
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={SPRING}
        >

          {/* Brilho dourado decorativo */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-gold/8 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

          <div className="relative p-12 rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-gold/25 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
            <Image
              src={darkSide ? '/logo-branca.png' : logoSrc}
              alt={title}
              width={darkSide ? 240 : 220}
              height={darkSide ? 240 : 220}
              priority
              className={darkSide ? 'drop-shadow-[0_8px_24px_rgba(212,175,55,0.35)]' : ''}
            />
          </div>
          <div>
            <motion.h1
              className={`text-3xl font-serif font-bold tracking-tight text-center ${titleClassName ?? (darkSide || sideBgImage ? 'text-foreground' : 'text-gray-900')}`}
              variants={TEXT_VARIANTS}
              initial="initial"
              animate="animate"
            >
              {title}
            </motion.h1>
            <motion.div
              className="mx-auto mt-4 mb-5 h-px w-16 bg-gold/50"
              variants={ITEM_VARIANTS}
              initial="initial"
              animate="animate"
            />
            {subtitle && (
              <motion.p
                className={`text-lg max-w-md text-center leading-relaxed ${darkSide || sideBgImage ? 'text-foreground/60' : 'text-foreground/60'}`}
                variants={TEXT_VARIANTS}
                initial="initial"
                animate="animate"
              >
                {subtitle}
              </motion.p>
            )}
          </div>
          <motion.p
            className="mt-6 text-[11px] uppercase tracking-[0.3em] text-gold/70 font-semibold"
            variants={ITEM_VARIANTS}
            initial="initial"
            animate="animate"
          >
            Agnaldo Gomes - Ecossistema Digital
          </motion.p>
        </motion.div>
      )}

      {/* Painel do formulário — centralizado na tela ou coluna direita */}
      <div className={`flex flex-col items-center justify-center relative z-10 ${
        centeredCard
          ? 'w-full max-w-md my-auto'
          : `w-full lg:w-1/2 px-6 py-20 ${sideBgImage ? 'bg-transparent text-foreground' : 'bg-background'}`
      }`}>
        <motion.div
          className={`w-full max-w-md ${
            centeredCard
              ? 'bg-black/60 backdrop-blur-md border border-white/10 p-8 sm:p-12 rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)]'
              : sideBgImage
              ? 'bg-black/60 backdrop-blur-xl border border-white/10 p-8 sm:p-12 rounded-[2rem] shadow-2xl'
              : ''
          }`}
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Logo visível apenas no mobile quando NÃO estiver em modo centralizado */}
          {!centeredCard && (
            <motion.div
              className="lg:hidden flex flex-col items-center gap-4 mb-10"
              variants={ITEM_VARIANTS}
            >
              <div className="p-6 rounded-2xl bg-gradient-to-b from-gold/15 to-gold/5 border border-gold/25">
                <Image src="/logo-branca.png" alt={title} width={120} height={120} />
              </div>
              <motion.h1
                className={`text-2xl font-serif font-bold text-center ${titleClassName ?? 'text-foreground'}`}
                variants={TEXT_VARIANTS}
              >
                {title}
              </motion.h1>
            </motion.div>
          )}

          <motion.h2
            className={`text-3xl font-bold mb-1 ${
              centeredCard ? 'text-center text-white' : sideBgImage ? 'text-white' : 'text-foreground'
            }`}
            variants={TEXT_VARIANTS}
          >
            {formTitle}
          </motion.h2>
          {formSubtitle && (
            <motion.p
              className={`text-sm mb-6 ${
                centeredCard ? 'text-center text-white/70' : sideBgImage ? 'text-white/70' : 'text-foreground/60'
              }`}
              variants={ITEM_VARIANTS}
            >
              {formSubtitle}
            </motion.p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <motion.div variants={ITEM_VARIANTS}>
              <label htmlFor="split-email" className={`block text-sm font-medium mb-1.5 ${sideBgImage || centeredCard ? 'text-white/90' : 'text-foreground/80'}`}>
                E-mail
              </label>
              <input
                id="split-email"
                type="email"
                name="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold ${
                  sideBgImage || centeredCard
                    ? 'bg-black/40 border-white/20 text-white placeholder:text-white/40 focus:bg-black/60'
                    : 'bg-[var(--card-bg)] border-gold/20 text-foreground placeholder:text-foreground/40'
                }`}
                aria-label="E-mail"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-[var(--color-danger)] text-xs mt-1.5" role="alert">{errors.email}</p>}
            </motion.div>

            <motion.div variants={ITEM_VARIANTS}>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="split-password" className={`block text-sm font-medium ${sideBgImage || centeredCard ? 'text-white/90' : 'text-foreground/80'}`}>
                  Senha
                </label>
                <Link href="/esqueci-senha" className="text-xs text-gold hover:text-gold-dim transition-colors">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="split-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Sua senha"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold pr-12 ${
                    sideBgImage || centeredCard
                      ? 'bg-black/40 border-white/20 text-white placeholder:text-white/40 focus:bg-black/60'
                      : 'bg-[var(--card-bg)] border-gold/20 text-foreground placeholder:text-foreground/40'
                  }`}
                  aria-label="Senha"
                  aria-invalid={!!errors.password}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                    sideBgImage || centeredCard ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-foreground/40 hover:text-foreground hover:bg-foreground/5'
                  }`}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-[var(--color-danger)] text-xs mt-1.5" role="alert">{errors.password}</p>}
            </motion.div>

            {/* Exibicao de Erro Geral */}
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
              <motion.p className={`text-center text-sm pt-1 ${sideBgImage || centeredCard ? 'text-white/60' : 'text-foreground/60'}`} variants={ITEM_VARIANTS}>
                Nao tem conta?{' '}
                <Link href={registerHref} className="text-gold hover:text-gold-dim font-medium transition-colors">
                  {registerLabel}
                </Link>
              </motion.p>
            )}

            <motion.div variants={ITEM_VARIANTS} className="text-center mt-6">
              <Link
                href={backHref}
                className={`inline-flex items-center gap-2 text-sm transition-colors hover:underline ${
                  sideBgImage || centeredCard ? 'text-white/60 hover:text-white' : 'text-foreground/50 hover:text-foreground'
                }`}
              >
                <ArrowLeft size={16} /> {backLabel}
              </Link>
            </motion.div>

            {hint && (
              <motion.p className="text-center text-xs text-foreground/40 pt-2 leading-relaxed" variants={ITEM_VARIANTS}>
                {hint}
              </motion.p>
            )}
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
