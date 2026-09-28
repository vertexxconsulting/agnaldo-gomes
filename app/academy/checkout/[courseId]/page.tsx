'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CreditCard, Mail, Loader2, AlertTriangle, Shield, Sparkles } from 'lucide-react';
import { formatBRL } from '@/lib/pagamentos-academy';

interface CheckoutPageProps {
  params: Promise<{ courseId: string }>;
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const courseId = use(params);
  const router = useRouter();
  const [step, setStep] = useState<'info' | 'loading' | 'redirect' | 'error'>('info');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cupom, setCupom] = useState('');
  const [cupomValido, setCupomValido] = useState<boolean | null>(null);
  const [valorOriginal, setValorOriginal] = useState<number | null>(null);
  const [valorComCupom, setValorComCupom] = useState<number | null>(null);
  const [msgCupom, setMsgCupom] = useState('');
  const [course, setCourse] = useState<any>(null);
  const [courseLoading, setCourseLoading] = useState(true);

  useEffect(() => {
    const carregarCurso = async () => {
      try {
        const res = await fetch(`/api/admin-academy/cursos/${courseId}`);
        const data = await res.json().catch(() => null);
        if (data && !Array.isArray(data)) setCourse(data);
      } catch (err: unknown) {
        console.error('[checkout] erro ao carregar curso:', err);
      } finally {
        setCourseLoading(false);
      }
    };
    carregarCurso();
  }, [courseId]);

  if (courseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!course || Array.isArray(course)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center text-foreground/60">Curso não encontrado.</div>
      </div>
    );
  }

  const precoCurso = Number(course.price || 0);
  const cupomAplicado = cupom.trim().toUpperCase();

  useEffect(() => {
    if (!cupomAplicado || !courseId) {
      setValorOriginal(precoCurso);
      setValorComCupom(precoCurso);
      setCupomValido(null);
      setMsgCupom('');
      return;
    }

    const validarCupom = async () => {
      try {
        const res = await fetch(`/api/academy/checkout/validate-coupon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cupomAplicado, courseId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.valid) {
            setValorOriginal(precoCurso);
            setValorComCupom(data.finalPrice);
            setCupomValido(true);
            setMsgCupom(data.discountLabel || '');
          } else {
            setCupomValido(false);
            setMsgCupom(data?.error || 'Cupom inválido ou expirado.');
            setValorOriginal(precoCurso);
            setValorComCupom(precoCurso);
          }
        } else {
          setCupomValido(false);
          setMsgCupom('Erro ao validar cupom.');
          setValorOriginal(precoCurso);
          setValorComCupom(precoCurso);
        }
      } catch {
        setCupomValido(false);
        setMsgCupom('Erro de conexão ao validar cupom.');
        setValorOriginal(precoCurso);
        setValorComCupom(precoCurso);
      }
    };

    validarCupom();
  }, [cupomAplicado, precoCurso, courseId]);

  const iniciarCheckout = async () => {
    if (!nome.trim() || !email.trim() || !email.includes('@')) {
      router.push(`/academy/checkout/${courseId}?error=dados`);
      return;
    }
    setStep('loading');
    try {
      const res = await fetch(`/api/academy/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: `Matrícula: ${course.title}`,
          valorBRL: valorComCupom ?? 0,
          nomeAluno: nome.trim(),
          emailAluno: email.trim(),
          cursoId: courseId,
          cupom_code: cupomValido ? cupomAplicado : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Falha ao criar checkout' }));
        throw new Error(err.error || 'Falha ao criar checkout');
      }
      const data = await res.json();
      setStep('redirect');
      window.location.href = data.url;
    } catch (err) {
      setStep('error');
      console.error('[checkout] erro:', err);
    }
  };

  const pedidoValido = nome.trim().length > 0 && email.includes('@');
  const checkoutLabel = valorComCupom !== null && valorComCupom !== precoCurso ? `— ${formatBRL(valorComCupom)}` : '';
  const stepIcon: React.ReactNode = step === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 'redirect' ? <Check className="w-4 h-4 text-green-400" /> : null;

  // --- LIVE PRICE BADGE ---
  const badgeColor = cupomValido
    ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : cupomValido === false
    ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : 'bg-gold/10 text-gold border-gold/30';

  const badgeText = cupomValido
    ? `${msgCupom || 'Ativo'}`
    : cupomValido === false
    ? 'Inválido'
    : '';

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 text-xs text-foreground/50 uppercase tracking-wider">
          <span className={step === 'info' ? 'text-gold font-bold' : ''}>Seus Dados</span>
          <span className="text-foreground/20">·</span>
          <span className={step === 'loading' || step === 'redirect' ? 'text-gold font-bold' : ''}>Pagamento</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold">
            <CreditCard size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Finalizar pagamento</h1>
            <p className="text-sm text-foreground/60">Curso: {course.title}</p>
          </div>
        </div>

        {/* Course card */}
        <div className="bg-card-bg border border-gold/20 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-4">
            {course.thumbnail_url && (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-20 h-20 rounded-md object-cover bg-foreground/[0.03] shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-foreground truncate">{course.title}</h2>
              {course.description && <p className="text-sm text-foreground/60 mt-1 line-clamp-2">{course.description}</p>}
              <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold text-gold">{formatBRL(precoCurso)}</span>
                {cupomValido && (
                  <span className="text-sm text-foreground/50 line-through">{formatBRL(valorOriginal ?? precoCurso)}</span>
                )}
                {cupomValido && <span className="text-sm font-semibold text-green-400">{msgCupom}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Live price badge (when coupon applied) */}
        {cupomAplicado && badgeText && (
          <div className={`rounded-lg p-3 mb-4 flex items-center gap-3 text-sm border transition-all duration-300 ${badgeColor} animate-fade-in`}>
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{badgeText}</span>
            {cupomValido && (
              <span className="ml-auto font-bold text-gold">
                {formatBRL(valorComCupom ?? precoCurso)}
              </span>
            )}
          </div>
        )}

        {/* Error alerts */}
        {cupomAplicado && cupomValido === false && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-start gap-3 text-sm text-red-300">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            {msgCupom}
          </div>
        )}
        {step === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-300">
            Não foi possível iniciar o pagamento. Tente novamente.
          </div>
        )}

        {/* Loading step */}
        {step === 'loading' && (
          <div className="bg-card-bg rounded-xl p-8 text-center mb-6">
            <Loader2 className="w-8 h-8 mx-auto text-gold animate-spin mb-3" />
            <p className="text-sm text-foreground/70">Preparando checkout seguro...</p>
          </div>
        )}

        {/* Redirect step */}
        {step === 'redirect' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center mb-6">
            <Check className="w-8 h-8 mx-auto text-green-400 mb-2" />
            <p className="text-sm text-foreground/70 mb-4">Redirecionando para o Stripe...</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-gold hover:underline focus:outline-none focus:underline"
            >
              Não foi redirecionado? Clique aqui.
            </button>
          </div>
        )}

        {/* Info form (3-step style) */}
        {step === 'info' && (
          <div className="bg-card-bg border border-gold/20 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Mail size={18} className="text-gold" /> Seus dados
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-3 py-2.5 rounded-md bg-foreground/[0.03] border border-gold/20 text-foreground placeholder:text-foreground/40 focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-3 py-2.5 rounded-md bg-foreground/[0.03] border border-gold/20 text-foreground placeholder:text-foreground/40 focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm"
                />
              </div>
            </div>

            <hr className="border-gold/10" />

            {/* Cupom */}
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Cupom de desconto (opcional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cupom}
                  onChange={e => setCupom(e.target.value.toUpperCase())}
                  placeholder="CUPOM2024"
                  className="flex-1 px-3 py-2.5 rounded-md bg-foreground/[0.03] border border-gold/20 text-foreground placeholder:text-foreground/40 focus:border-gold focus:ring-1 focus:ring-gold outline-none text-sm uppercase tracking-wider"
                />
                <button
                  onClick={() => setCupom('')}
                  className="px-3 py-2.5 rounded-md border border-gold/20 text-foreground/60 hover:text-foreground hover:border-gold text-sm transition-colors"
                  type="button"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-2 text-xs text-foreground/50">
              <Shield className="w-4 h-4 text-gold shrink-0" />
              Pagamento 100% seguro via Stripe — Pix e Cartão de Crédito
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.back()}
                className="px-5 py-2.5 rounded-md border border-gold/20 text-foreground/70 hover:bg-gold/5 text-sm transition-colors"
                type="button"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  if (!pedidoValido) return;
                  iniciarCheckout();
                }}
                className={`flex-1 py-2.5 rounded-md bg-gold text-black font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gold-dim disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold`}
                type="button"
                disabled={!pedidoValido || step !== 'info'}
              >
                {stepIcon}
                Pagar com Stripe {checkoutLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
