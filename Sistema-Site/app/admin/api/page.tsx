'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { Link as LinkIcon, Activity, AlertTriangle, CheckCircle2, RefreshCw, Globe } from 'lucide-react';

export default function SistemaApiPage() {
  const [instance, setInstance] = useState('');
  const [evoStatus, setEvoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [healthChecks, setHealthChecks] = useState<Record<string, { status: 'ok' | 'error' | 'warning' | 'idle', msg: string }> | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    const carregarConfig = async () => {
      try {
        const res = await fetch('/api/admin/sistema/config');
        if (res.ok) {
          const data = await res.json();
          setInstance(data.instance || '');
        }
      } catch (e) {
        console.error('Erro ao carregar config da Evolution:', e);
      }
    };
    carregarConfig();
  }, []);

  const checkAllSystems = async () => {
    setCheckingHealth(true);
    try {
      const res = await fetch('/api/admin/sistema/health-check');
      if (res.ok) {
        const data = await res.json();
        setHealthChecks(data);
      }
    } catch (e) {
      console.error('Erro no health check:', e);
    } finally {
      setCheckingHealth(false);
    }
  };

  const testEvolutionConnection = async () => {
    if (!instance) {
      setEvoStatus('error');
      return;
    }

    setEvoStatus('loading');
    try {
      const res = await fetch('/api/admin/sistema/evolution/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance })
      });

      if (res.ok) {
        setEvoStatus('success');
      } else {
        setEvoStatus('error');
      }
    } catch (err) {
      setEvoStatus('error');
    }
  };

  const saveConfig = async () => {
    try {
      const res = await fetch('/api/admin/sistema/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance })
      });
      if (res.ok) {
        alert('Configurações salvas com sucesso!');
      } else {
        alert('Erro ao salvar configurações.');
      }
    } catch (e) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="py-4 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground flex items-center gap-2">
          <Globe className="text-gold" size={32} />
          Sistema API
        </h1>
        <p className="text-sm text-foreground/60 mt-1">
          Centralização de conexões com serviços externos (WhatsApp, Mercado Pago, Melhor Envio, etc).
        </p>
      </div>

      <CardGlass className="p-6 border-l-4 border-l-primary">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold/10 text-gold rounded-lg">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Painel de Saúde das APIs</h3>
              <p className="text-sm text-foreground/60">Verificação de conectividade de todos os serviços externos.</p>
            </div>
          </div>
          <Button onClick={checkAllSystems} variant="outline" disabled={checkingHealth}>
            {checkingHealth ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Sincronizando...
              </span>
            ) : 'Sincronizar Status'}
          </Button>
        </div>

        {healthChecks ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(healthChecks).map(([api, info]) => (
              <div key={api} className="p-3 rounded-xl border border-[var(--border-subtle)] bg-background/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    info.status === 'ok' ? 'bg-emerald-500' : 
                    info.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs font-bold uppercase text-foreground/70">{api}</span>
                </div>
                <span className={`text-[10px] font-medium ${
                  info.status === 'ok' ? 'text-emerald-500' : 
                  info.status === 'warning' ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {info.msg}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-foreground/40 italic">
            Clique em "Sincronizar Status" para validar as conexões.
          </div>
        )}
      </CardGlass>

      <CardGlass className="p-6 border-l-4 border-l-primary">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gold/10 text-gold rounded-lg">
            <LinkIcon size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">Conexão WhatsApp (Evolution API)</h3>
            <p className="text-sm text-foreground/60">Configurações de segurança movidas para a Vercel. Defina apenas a instância.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs font-bold text-foreground/60 uppercase ml-1">Instância do WhatsApp</label>
            <input
              value={instance}
              onChange={e => setInstance(e.target.value)}
              placeholder="Ex: StudioAgnaldo"
              className="bg-background border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={testEvolutionConnection} variant="outline" disabled={evoStatus === 'loading'}>
              {evoStatus === 'loading' ? 'Testando...' : 'Testar Conexão'}
            </Button>
            <Button onClick={saveConfig} variant="primary">
              Salvar Configuração
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 rounded-xl bg-foreground/5 border border-[var(--border-subtle)]">
          <div className="flex-1 flex items-center gap-2 text-sm">
            <Activity size={16} className="text-foreground/40" />
            <span className="text-foreground/60">Status da conexão: </span>
            {evoStatus === 'success' ? (
              <span className="text-success font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Ativa e Sincronizada</span>
            ) : evoStatus === 'error' ? (
              <span className="text-danger font-bold flex items-center gap-1"><AlertTriangle size={14} /> Offline ou Inválida</span>
            ) : (
              <span className="text-foreground/40 italic">Aguardando teste...</span>
            )}
          </div>
        </div>
      </CardGlass>
    </div>
  );
}
