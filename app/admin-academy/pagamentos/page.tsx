'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, CreditCard, ExternalLink } from 'lucide-react';

export default function AdminPagamentosAcademy() {
  const [ativo, setAtivo] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/env-status')
      .then(r => r.json())
      .then(data => setAtivo(!!data.stripe))
      .catch(() => setAtivo(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={22} className="text-amber-600" /> Pagamentos — Academy
        </h1>
        <p className="text-slate-500 mt-1">
          Status da integração Stripe para matrículas, cursos e assinaturas da Academy.
        </p>
      </div>

      {/* Status atual */}
      {ativo === null ? (
        <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
          Verificando status do Stripe...
        </div>
      ) : (
        <div
          className={`rounded-lg border p-4 flex items-start gap-3 ${
            ativo
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          {ativo ? (
            <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          )}
          <div className="text-sm">
            <p className="font-semibold text-slate-900">
              {ativo ? 'Stripe ATIVO' : 'Stripe não configurado'}
            </p>
            <p className="text-slate-600 mt-0.5">
              {ativo
                ? 'As matrículas na Academy são direcionadas ao checkout seguro do Stripe (cartão ou PIX), com cobrança real.'
                : 'As variáveis de ambiente STRIPE_SECRET_KEY e STRIPE_PUBLIC_KEY não estão configuradas. Configure-as no painel da Vercel ou no arquivo .env.local.'}
            </p>
          </div>
        </div>
      )}

      {/* Instruções de configuração */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck size={18} className="text-amber-600" />
          <h2 className="font-bold text-slate-900">Como configurar</h2>
        </div>
        <div className="text-sm text-slate-600 space-y-3">
          <p>
            As chaves do Stripe são gerenciadas via <strong>variáveis de ambiente</strong> (Vercel / <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code>):
          </p>
          <div className="bg-slate-50 rounded-md p-4 font-mono text-xs space-y-1">
            <p><span className="text-amber-700">STRIPE_PUBLIC_KEY</span>=pk_live_sua_publishable_key</p>
            <p><span className="text-amber-700">STRIPE_SECRET_KEY</span>=sk_live_sua_secret_key</p>
            <p><span className="text-amber-700">STRIPE_WEBHOOK_SECRET</span>=whsec_seu_webhook_secret</p>
          </div>
          <p>
            Gere as chaves em{' '}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 underline hover:text-amber-700 inline-flex items-center gap-1"
            >
              Stripe Dashboard → Developers → API Keys <ExternalLink size={12} />
            </a>
          </p>
          <p>
            Use as chaves de teste (<code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">pk_test_</code> / <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">sk_test_</code>) enquanto valida o fluxo e as de produção (<code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">pk_live_</code> / <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">sk_live_</code>) para ativar o pagamento real.
          </p>
        </div>
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
              Na vitrine da Academy, o aluno seleciona o curso e clica em &quot;Matricular-se&quot;.
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
              Após o pagamento, o webhook do Stripe confirma e libera o acesso ao curso automaticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
