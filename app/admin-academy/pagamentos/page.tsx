'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Key, Eye, EyeOff, AlertTriangle, CheckCircle2, CreditCard } from 'lucide-react';
import {
  getStripeConfig, saveStripeConfig, isStripeAtivo, validarChavesStripe,
} from '@/lib/pagamentos-academy';

export default function AdminPagamentosAcademy() {
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [ativo, setAtivo] = useState(false);
  const [mostrar, setMostrar] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState('');
  const [ativoReal, setAtivoReal] = useState(false);

  useEffect(() => {
    getStripeConfig()
      .then(cfg => {
        setPublicKey(cfg.publicKey);
        setSecretKey(cfg.secretKey);
        setAtivo(cfg.ativo);
        setAtivoReal(cfg.ativo);
      })
      .catch(() => undefined);
  }, []);

  const salvar = async () => {
    const validacao = validarChavesStripe(publicKey, secretKey);
    if (!validacao.ok) {
      setErro(validacao.msg);
      return;
    }
    setErro('');
    const valor = publicKey.trim();
    const cfg = { publicKey: valor, secretKey: secretKey.trim(), ativo: valor.length > 0 };
    await saveStripeConfig(cfg);
    setAtivo(valor.length > 0);
    setAtivoReal(valor.length > 0);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck size={22} className="text-primary" /> Pagamentos â€” Academy
        </h1>
        <p className="text-foreground/50 mt-1">
          ConfiguraÃ§Ã£o do Stripe para matrÃ­culas, cursos e assinaturas da Academy.
        </p>
      </div>

      {/* Status atual */}
      <div
        className={`rounded-lg border p-4 flex items-start gap-3 ${
          ativoReal
            ? 'bg-success/10 border-success/20'
            : 'bg-warning/10 border-warning/25'
        }`}
      >
        {ativoReal ? (
          <CheckCircle2 size={20} className="text-success mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle size={20} className="text-primary mt-0.5 shrink-0" />
        )}
        <div className="text-sm">
          <p className="font-semibold text-foreground">
            {ativoReal ? 'Stripe ATIVO' : 'Stripe em modo demonstraÃ§Ã£o'}
          </p>
          <p className="text-foreground/70 mt-0.5">
            {ativoReal
              ? 'As matrÃ­culas na Academy sÃ£o direcionadas ao checkout seguro do Stripe (cartÃ£o ou PIX), com cobranÃ§a real.'
              : 'Insira as chaves abaixo para ativar o pagamento real. Enquanto isso, as inscriÃ§Ãµes sÃ£o registradas localmente (demonstraÃ§Ã£o).'}
          </p>
        </div>
      </div>

      {/* Painel de credenciais */}
      <div className="bg-card rounded-lg border border-[var(--border-subtle)] p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <Key size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Credenciais Stripe</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
              Publishable Key (pk_...)
            </label>
            <input
              type="text"
              value={publicKey}
              onChange={e => setPublicKey(e.target.value)}
              placeholder="pk_live_sua_publishable_key"
              className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 rounded-md font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide flex items-center justify-between">
              <span>Secret Key (sk_...)</span>
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                className="text-primary text-xs font-bold hover:text-primary-hover flex items-center gap-1"
              >
                {mostrar ? <EyeOff size={12} /> : <Eye size={12} />} {mostrar ? 'Ocultar' : 'Mostrar'}
              </button>
            </label>
            <input
              type={mostrar ? 'text' : 'password'}
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder="sk_live_sua_secret_key"
              className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 rounded-md font-mono"
            />
            <p className="text-xs text-foreground/50">
              A Secret Key fica apenas no servidor (nunca Ã© enviada ao navegador) e Ã© usada para criar as sessÃµes de checkout.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={salvar}
            disabled={!publicKey.trim()}
            className="bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-md transition-colors"
          >
            Salvar credenciais
          </button>
          {salvo && (
            <span className="text-xs font-semibold text-success flex items-center gap-1">
              <CheckCircle2 size={14} /> Credenciais salvas â€” checkout Stripe ativado.
            </span>
          )}
          {erro && (
            <span className="text-xs font-semibold text-danger flex items-center gap-1">
              <AlertTriangle size={14} /> {erro}
            </span>
          )}
        </div>

        <p className="text-xs text-foreground/50 border-t border-[var(--border-subtle)] pt-3">
          Gere as chaves em{' '}
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary-hover"
          >
            Stripe Dashboard â†’ Developers â†’ API Keys
          </a>
          . Use as chaves de teste (pk_test_/sk_test_) enquanto valida o fluxo e as de produÃ§Ã£o (pk_live_/sk_live_) para ativar o pagamento real.
        </p>
      </div>

      {/* Como funciona */}
      <div className="bg-card rounded-lg border border-[var(--border-subtle)] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <CreditCard size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Como funciona a matrÃ­cula paga</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-[var(--background)] rounded-lg p-4">
            <p className="font-bold text-foreground mb-1">1. Aluno escolhe o curso</p>
            <p className="text-foreground/70">
              Na vitrine da Academy, o aluno seleciona o curso e clica em &quot;Matricular-se&quot;.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <p className="font-bold text-foreground mb-1">2. Checkout Stripe</p>
            <p className="text-foreground/70">
              O aluno Ã© redirecionado ao checkout seguro do Stripe para pagar com cartÃ£o ou PIX.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <p className="font-bold text-foreground mb-1">3. Acesso liberado</p>
            <p className="text-foreground/70">
              ApÃ³s o pagamento, o aluno Ã© devolvido Ã  Academy com o acesso ao curso liberado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
