'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import {
  isStripeAtivo, criarCheckoutStripe, formatBRL,
} from '@/lib/pagamentos-academy';

interface PlanoSelecionado {
  curso: string;
  label: string;
  valor: string;
}

/**
 * Modal de matrícula paga da Academy via Stripe.
 * Quando o Stripe estiver configurado, redireciona ao checkout real;
 * sem configuração, registra a matrícula localmente (demonstração).
 */
export function AcademyCheckout({
  curso, planos, onClose,
}: {
  curso: string;
  planos: { label: string; valor: string }[];
  onClose: () => void;
}) {
  const [plano, setPlano] = useState<PlanoSelecionado | null>(
    planos.length > 0
      ? { curso, label: planos[0].label, valor: planos[0].valor }
      : { curso, label: 'Matrícula', valor: 'R$ 1.200' }
  );
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [registrado, setRegistrado] = useState(false);

  const valorNumerico = Number(
    (plano?.valor ?? '0').replace(/[^\d,]/g, '').replace(',', '.')
  );

  const confirmar = async () => {
    setErro('');
    if (!plano) return;
    if (!nome.trim()) {
      setErro('Informe seu nome completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      if (isStripeAtivo()) {
        const res = await criarCheckoutStripe({
          descricao: `Matrícula Academy AG — ${curso} (${plano.label})`,
          valorBRL: valorNumerico,
          nomeAluno: nome.trim(),
          emailAluno: email.trim(),
          cursoId: curso,
        });
        window.location.href = res.url;
        return;
      }
      // Modo demonstração: registra a matrícula localmente
      try {
        const existing = JSON.parse(localStorage.getItem('academy-matriculas') || '[]');
        existing.push({
          curso, plano: plano.label, valor: plano.valor,
          nome: nome.trim(), email: email.trim(),
          criado_em: new Date().toISOString(),
          status: 'demo',
        });
        localStorage.setItem('academy-matriculas', JSON.stringify(existing));
      } catch {}
      setRegistrado(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar o checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--color-card)] rounded-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-primary/20">
          <h3 className="font-serif text-xl font-bold flex items-center gap-2">
            <CreditCard className="text-primary" size={20} />
            Matricular-se — {curso}
          </h3>
          <p className="text-xs text-foreground/60 mt-1">
            {isStripeAtivo()
              ? 'Pagamento seguro pelo Stripe (cartão ou PIX).'
              : 'Demonstração — configure o Stripe no painel para pagamento real.'}
          </p>
        </div>

        {registrado ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="text-emerald-500 mx-auto" size={44} />
            <p className="font-bold">Matrícula registrada!</p>
            <p className="text-sm text-foreground/70">
              No modo demonstração, sua inscrição ficou salva localmente.
              {isStripeAtivo() ? '' : ' Ao configurar o Stripe, novas matrículas serão direcionadas ao checkout com pagamento real.'}
            </p>
            <button
              onClick={onClose}
              className="bg-primary text-background px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-foreground/70">Plano</label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {planos.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setPlano({ curso, label: p.label, valor: p.valor })}
                    className={`flex items-center justify-between border rounded-lg px-4 py-2.5 text-sm transition-colors ${
                      plano?.label === p.label
                        ? 'border-primary bg-primary/10 font-bold'
                        : 'border-foreground/15 hover:border-primary/50'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-primary">{p.valor}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-foreground/70">Nome completo</label>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1 w-full bg-background border border-foreground/15 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-foreground/70">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="mt-1 w-full bg-background border border-foreground/15 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {erro && (
              <p className="text-xs font-semibold text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{erro}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 border border-foreground/15 text-foreground/70 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-foreground/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={loading}
                className="flex-1 bg-primary text-background px-4 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-opacity inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Abrindo pagamento...</>
                ) : (
                  <>{isStripeAtivo() ? <><ExternalLink size={14} /> Pagar {formatBRL(valorNumerico)}</> : 'Confirmar matrícula'}</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
