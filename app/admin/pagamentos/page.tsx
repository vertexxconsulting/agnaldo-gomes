'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, QrCode } from 'lucide-react';

export default function AdminPagamentosStudio() {
  const [testando, setTestando] = useState(false);
  const [testeStatus, setTesteStatus] = useState<'ok' | 'erro' | null>(null);
  const [ativoReal, setAtivoReal] = useState(false);

  useEffect(() => {
    verificarStatus();
  }, []);

  const verificarStatus = async () => {
    try {
      const res = await fetch('/api/env-status');
      if (res.ok) {
        const data = await res.json();
        setAtivoReal(data.mercadoPago);
      }
    } catch {
      setAtivoReal(false);
    }
  };

  const testarConexao = async () => {
    setTestando(true);
    setTesteStatus(null);
    try {
      const res = await fetch('/api/env-status');
      if (res.ok) {
        const data = await res.json();
        setAtivoReal(data.mercadoPago);
        if (data.mercadoPago) {
          setTesteStatus('ok');
        } else {
          setTesteStatus('erro');
        }
      } else {
        setTesteStatus('erro');
      }
    } catch {
      setTesteStatus('erro');
    } finally {
      setTestando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={22} className="text-amber-600" /> Pagamentos — Studio
        </h1>
        <p className="text-slate-500 mt-1">
          Configuração do Mercado Pago para sinais e pagamentos de agendamentos (Dia da Noiva e serviços).
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
            {ativoReal ? 'Mercado Pago ATIVO' : 'Mercado Pago Não Configurado ou em modo demonstração'}
          </p>
          <p className="text-slate-600 mt-0.5">
            {ativoReal
              ? 'Os PIX gerados nos pagamentos do Studio (Noiva e agenda) são reais, com QR Code e código copia-e-cola do Mercado Pago.'
              : 'As variáveis de ambiente do Mercado Pago (MERCADO_PAGO_ACCESS_TOKEN) não estão configuradas na Vercel. Os pagamentos gerados serão simulados.'}
          </p>
        </div>
      </div>

      {/* Painel de credenciais */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck size={18} className="text-amber-600" />
          <h2 className="font-bold text-slate-900">Conexão via Vercel</h2>
        </div>

        <p className="text-sm text-slate-600">
          As credenciais do Mercado Pago agora são gerenciadas exclusivamente pelas variáveis de ambiente da <b>Vercel</b> (<code>MERCADO_PAGO_ACCESS_TOKEN</code>). Não é possível inserir ou alterar a chave diretamente no sistema por motivos de segurança.
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button
            onClick={testarConexao}
            disabled={testando}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-colors"
          >
            {testando ? 'Testando...' : 'Verificar conexão'}
          </button>
          {testeStatus === 'ok' && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={14} /> Conexão válida com o Mercado Pago na Vercel.
            </span>
          )}
          {testeStatus === 'erro' && (
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <AlertTriangle size={14} /> Nenhuma credencial encontrada nas variáveis de ambiente.
            </span>
          )}
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <QrCode size={18} className="text-amber-600" />
          <h2 className="font-bold text-slate-900">Como funciona o pagamento</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-50 rounded-md p-4">
            <p className="font-bold text-slate-900 mb-1">1. Agendamento</p>
            <p className="text-slate-600">
              Em Dia da Noiva, o agendamento fica como "Sinal Pendente" até o pagamento de no mínimo 50%.
            </p>
          </div>
          <div className="bg-slate-50 rounded-md p-4">
            <p className="font-bold text-slate-900 mb-1">2. PIX via Mercado Pago</p>
            <p className="text-slate-600">
              Ao clicar em "Gerar PIX", o sistema cria a cobrança real (se configurado na Vercel) e exibe o QR Code.
            </p>
          </div>
          <div className="bg-slate-50 rounded-md p-4">
            <p className="font-bold text-slate-900 mb-1">3. Confirmação</p>
            <p className="text-slate-600">
              Após o cliente pagar, registre o pagamento e o agendamento passa automaticamente para "Sinal Pago", protegendo a agenda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
