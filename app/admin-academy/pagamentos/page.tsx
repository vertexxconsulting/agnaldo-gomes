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
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={22} className="text-amber-600" /> Pagamentos — Academy
        </h1>
        <p className="text-slate-500 mt-1">
          Configuração do Stripe para matrículas, cursos e assinaturas da Academy.
        </p>
      </div>

      {/* Status atual */}
      <div
        className={`rounded-lg border p-4 flex items-start gap-3 ${
          ativoReal
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        {ativoReal ? (
          <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
        )}
        <div className="text-sm">
          <p className="font-semibold text-slate-900">
            {ativoReal ? 'Stripe ATIVO' : 'Stripe em modo demonstração'}
          </p>
          <p className="text-slate-600 mt-0.5">
            {ativoReal
              ? 'As matrículas na Academy são direcionadas ao checkout seguro do Stripe (cartão ou PIX), com cobrança real.'
              : 'Insira as chaves abaixo para ativar o pagamento real. Enquanto isso, as inscrições são registradas localmente (demonstração).'}
          </p>
        </div>
      </div>

      {/* Painel de credenciais */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Key size={18} className="text-amber-600" />
          <h2 className="font-bold text-slate-900">Credenciais Stripe</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Publishable Key (pk_...)
            </label>
            <input
              type="text"
              value={publicKey}
              onChange={e => setPublicKey(e.target.value)}
              placeholder="pk_live_sua_publishable_key"
              className="w-full bg-slate-50 border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center justify-between">
              <span>Secret Key (sk_...)</span>
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                className="text-amber-600 text-xs font-bold hover:text-amber-700 flex items-center gap-1"
              >
                {mostrar ? <EyeOff size={12} /> : <Eye size={12} />} {mostrar ? 'Ocultar' : 'Mostrar'}
              </button>
            </label>
            <input
              type={mostrar ? 'text' : 'password'}
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder="sk_live_sua_secret_key"
              className="w-full bg-slate-50 border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md font-mono"
            />
            <p className="text-xs text-slate-500">
              A Secret Key fica apenas no servidor (nunca é enviada ao navegador) e é usada para criar as sessões de checkout.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={salvar}
            disabled={!publicKey.trim()}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-colors"
          >
            Salvar credenciais
          </button>
          {salvo && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={14} /> Credenciais salvas — checkout Stripe ativado.
            </span>
          )}
          {erro && (
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <AlertTriangle size={14} /> {erro}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
          Gere as chaves em{' '}
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 underline hover:text-amber-700"
          >
            Stripe Dashboard → Developers → API Keys
          </a>
          . Use as chaves de teste (pk_test_/sk_test_) enquanto valida o fluxo e as de produção (pk_live_/sk_live_) para ativar o pagamento real.
        </p>
      </div>

      {/* Como funciona */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <CreditCard size={18} className="text-amber-600" />
          <h2 className="font-bold text-slate-900">Como funciona a matrícula paga</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-50 rounded-md p-4">
            <p className="font-bold text-slate-900 mb-1">1. Aluno escolhe o curso</p>
            <p className="text-slate-600">
              Na vitrine da Academy, o aluno seleciona o curso e clica em "Matricular-se".
            </p>
          </div>
          <div className="bg-slate-50 rounded-md p-4">
            <p className="font-bold text-slate-900 mb-1">2. Checkout Stripe</p>
            <p className="text-slate-600">
              O aluno é redirecionado ao checkout seguro do Stripe para pagar com cartão ou PIX.
            </p>
          </div>
          <div className="bg-slate-50 rounded-md p-4">
            <p className="font-bold text-slate-900 mb-1">3. Acesso liberado</p>
            <p className="text-slate-600">
              Após o pagamento, o aluno é devolvido à Academy com o acesso ao curso liberado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
