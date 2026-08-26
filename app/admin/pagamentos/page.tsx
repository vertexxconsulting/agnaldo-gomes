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
  const [ativoReal, setAtivoReal] = useState(false);

  useEffect(() => {
    getMPConfig()
      .then(cfg => {
        setAccessToken(cfg.accessToken);
        setAtivo(cfg.ativo);
        setAtivoReal(cfg.ativo);
      })
      .catch(() => undefined);
  }, []);

  const salvar = async () => {
    const valor = accessToken.trim();
    const cfg = { accessToken: valor, ativo: valor.length > 0 };
    await saveMPConfig(cfg);
    setAtivo(cfg.ativo);
    setAtivoReal(cfg.ativo);
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
        await saveMPConfig({ accessToken: valor, ativo: true });
        setAtivo(true);
        setAtivoReal(true);
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
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck size={22} className="text-primary" /> Pagamentos â€” Studio
        </h1>
        <p className="text-foreground/50 mt-1">
          ConfiguraÃ§Ã£o do Mercado Pago para sinais e pagamentos de agendamentos (Dia da Noiva e serviÃ§os).
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
          <CheckCircle2 size={20} className="text-success mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle size={20} className="text-primary mt-0.5 shrink-0" />
        )}
        <div className="text-sm">
          <p className="font-semibold text-foreground">
            {ativoReal ? 'Mercado Pago ATIVO' : 'Mercado Pago em modo demonstraÃ§Ã£o'}
          </p>
          <p className="text-foreground/70 mt-0.5">
            {ativoReal
              ? 'Os PIX gerados nos pagamentos do Studio (Noiva e agenda) sÃ£o reais, com QR Code e cÃ³digo copia-e-cola do Mercado Pago.'
              : 'Insira o Access Token abaixo para ativar pagamentos reais. Enquanto isso, os cÃ³digos PIX gerados sÃ£o simulados (demonstraÃ§Ã£o).'}
          </p>
        </div>
      </div>

      {/* Painel de credenciais */}
      <div className="bg-card rounded-lg border border-[var(--border-subtle)] p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <Key size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Credenciais Mercado Pago</h2>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
            Access Token (ProduÃ§Ã£o)
          </label>
          <div className="relative">
            <input
              type={mostrar ? 'text' : 'password'}
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              placeholder="APP_USR-seu_access_token"
              className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 rounded-md font-mono"
            />
            <button
              onClick={() => setMostrar(!mostrar)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground/70"
              type="button"
            >
              {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-foreground/50">
            Gere o token em{' '}
            <a
              href="https://www.mercadopago.com.br/developers/panel/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary-hover"
            >
              Mercado Pago Developers â†’ Credenciais
            </a>{' '}
            (sua aplicaÃ§Ã£o â†’ Production access token).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={salvar}
            disabled={!accessToken.trim()}
            className="bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-md transition-colors"
          >
            Salvar credencial
          </button>
          <button
            onClick={testarConexao}
            disabled={testando || !accessToken.trim()}
            className="border border-[var(--border-subtle)] hover:bg-primary/10 disabled:opacity-40 text-foreground/70 text-sm font-semibold px-5 py-2.5 rounded-md transition-colors"
          >
            {testando ? 'Testando...' : 'Testar conexÃ£o'}
          </button>
          {salvo && (
            <span className="text-xs font-semibold text-success flex items-center gap-1">
              <CheckCircle2 size={14} /> Credencial salva â€” pagamentos reais ativados.
            </span>
          )}
          {testeStatus === 'ok' && (
            <span className="text-xs font-semibold text-success flex items-center gap-1">
              <CheckCircle2 size={14} /> ConexÃ£o vÃ¡lida com o Mercado Pago.
            </span>
          )}
          {testeStatus === 'erro' && (
            <span className="text-xs font-semibold text-danger flex items-center gap-1">
              <AlertTriangle size={14} /> Token invÃ¡lido â€” verifique o Access Token.
            </span>
          )}
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-card rounded-lg border border-[var(--border-subtle)] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <QrCode size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Como funciona o pagamento</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-[var(--background)] rounded-lg p-4">
            <p className="font-bold text-foreground mb-1">1. Agendamento</p>
            <p className="text-foreground/70">
              Em Dia da Noiva, o agendamento fica como "Sinal Pendente" atÃ© o pagamento de no mÃ­nimo 50%.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <p className="font-bold text-foreground mb-1">2. PIX via Mercado Pago</p>
            <p className="text-foreground/70">
              Ao clicar em "Gerar PIX", o sistema cria a cobranÃ§a real e exibe o QR Code com o cÃ³digo copia-e-cola.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <p className="font-bold text-foreground mb-1">3. ConfirmaÃ§Ã£o</p>
            <p className="text-foreground/70">
              ApÃ³s o cliente pagar, registre o pagamento e o agendamento passa automaticamente para "Sinal Pago", protegendo a agenda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
