'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Key, Eye, EyeOff, AlertTriangle, CheckCircle2, QrCode } from 'lucide-react';
import { getMPConfig, saveMPConfig, isMPAtivo } from '@/lib/pagamentos-studio';

export default function AdminPagamentosStudio() {
  const [accessToken, setAccessToken] = useState('');
  const [ativo, setAtivo] = useState(false);
  const [mostrar, setMostrar] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [testando, setTestando] = useState(false);
  const [testeStatus, setTesteStatus] = useState<'ok' | 'erro' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const cfg = getMPConfig();
    setAccessToken(cfg.accessToken);
    setAtivo(cfg.ativo);
  }, []);

  const salvar = () => {
    const valor = accessToken.trim();
    const cfg = { accessToken: valor, ativo: valor.length > 0 };
    saveMPConfig(cfg);
    setAtivo(cfg.ativo);
    setSalvo(true);
    setTesteStatus(null);
    setTimeout(() => setSalvo(false), 3000);
  };

  const testarConexao = async () => {
    setTestando(true);
    setTesteStatus(null);
    try {
      const res = await fetch('https://api.mercadopago.com/v1/account', {
        headers: { Authorization: `Bearer ${accessToken.trim()}` },
      });
      if (res.ok) {
        setTesteStatus('ok');
        const valor = accessToken.trim();
        saveMPConfig({ accessToken: valor, ativo: true });
        setAtivo(true);
      } else {
        setTesteStatus('erro');
      }
    } catch {
      setTesteStatus('erro');
    } finally {
      setTestando(false);
    }
  };

  if (!mounted) return null;

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
          isMPAtivo()
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        {isMPAtivo() ? (
          <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
        )}
        <div className="text-sm">
          <p className="font-semibold text-slate-900">
            {isMPAtivo() ? 'Mercado Pago ATIVO' : 'Mercado Pago em modo demonstração'}
          </p>
          <p className="text-slate-600 mt-0.5">
            {isMPAtivo()
              ? 'Os PIX gerados nos pagamentos do Studio (Noiva e agenda) são reais, com QR Code e código copia-e-cola do Mercado Pago.'
              : 'Insira o Access Token abaixo para ativar pagamentos reais. Enquanto isso, os códigos PIX gerados são simulados (demonstração).'}
          </p>
        </div>
      </div>

      {/* Painel de credenciais */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Key size={18} className="text-amber-600" />
          <h2 className="font-bold text-slate-900">Credenciais Mercado Pago</h2>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Access Token (Produção)
          </label>
          <div className="relative">
            <input
              type={mostrar ? 'text' : 'password'}
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              placeholder="APP_USR-seu_access_token"
              className="w-full bg-slate-50 border border-slate-300 px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-md font-mono"
            />
            <button
              onClick={() => setMostrar(!mostrar)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              type="button"
            >
              {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Gere o token em{' '}
            <a
              href="https://www.mercadopago.com.br/developers/panel/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 underline hover:text-amber-700"
            >
              Mercado Pago Developers → Credenciais
            </a>{' '}
            (sua aplicação → Production access token).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={salvar}
            disabled={!accessToken.trim()}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-colors"
          >
            Salvar credencial
          </button>
          <button
            onClick={testarConexao}
            disabled={testando || !accessToken.trim()}
            className="border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-md transition-colors"
          >
            {testando ? 'Testando...' : 'Testar conexão'}
          </button>
          {salvo && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={14} /> Credencial salva — pagamentos reais ativados.
            </span>
          )}
          {testeStatus === 'ok' && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={14} /> Conexão válida com o Mercado Pago.
            </span>
          )}
          {testeStatus === 'erro' && (
            <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <AlertTriangle size={14} /> Token inválido — verifique o Access Token.
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
              Ao clicar em "Gerar PIX", o sistema cria a cobrança real e exibe o QR Code com o código copia-e-cola.
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
