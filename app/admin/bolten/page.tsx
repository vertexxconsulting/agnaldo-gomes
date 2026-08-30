'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Key, 
  Activity, 
  RefreshCw 
} from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/Button';

export default function BoltenCRMPage() {
  const [loading, setLoading] = useState(true);
  const [testando, setTestando] = useState(false);
  const [copiadoWebhook, setCopiadoWebhook] = useState(false);
  const [statusEnv, setStatusEnv] = useState<{
    configurado: boolean;
    apiKeyMasked: string;
    projectId: string;
    kanbanComponentId: string;
    contactComponentId: string;
    webhookUrl: string;
  } | null>(null);

  const [resultadoTeste, setResultadoTeste] = useState<{
    sucesso: boolean;
    mensagem: string;
    logs: string[];
  } | null>(null);

  const carregarStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bolten/config');
      if (res.ok) {
        const data = await res.json();
        setStatusEnv(data);
      }
    } catch (err) {
      console.error('Erro ao verificar status do Bolten:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarStatus();
  }, []);

  const handleTestarConexao = async () => {
    setTestando(true);
    setResultadoTeste(null);
    try {
      const res = await fetch('/api/bolten/test', { method: 'POST' });
      const data = await res.json();
      setResultadoTeste({
        sucesso: res.ok && data.success,
        mensagem: data.message || data.error || 'Resultado do teste recebido.',
        logs: data.logs || [],
      });
    } catch (err: any) {
      setResultadoTeste({
        sucesso: false,
        mensagem: err?.message || 'Erro ao tentar se comunicar com o servidor.',
        logs: ['Falha de conexão com a API local'],
      });
    } finally {
      setTestando(false);
    }
  };

  const webhookUrlFull = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/bolten` 
    : 'https://agnaldogomes.com.br/api/webhooks/bolten';

  return (
    <div className="py-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground flex items-center gap-2.5">
            <Building2 className="text-primary" size={28} />
            CRM Bolten.io
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Status da integração configurada via variáveis de ambiente da Vercel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://app.bolten.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-primary/10 px-3.5 py-2 rounded-lg border border-primary/20"
          >
            Acessar Painel Bolten.io <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Card 1: Status das Variáveis de Ambiente */}
      <Panel className="p-6">
        <div className="flex items-center justify-between mb-4 border-b border-[var(--border-subtle)] pb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Key size={18} className="text-primary" />
            Variáveis de Ambiente Detectadas
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={carregarStatus} 
            className="text-xs flex items-center gap-1"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recarregar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] flex items-center justify-between">
            <span className="font-mono text-xs text-foreground/70">BOLTEN_API_KEY</span>
            {statusEnv?.apiKeyMasked ? (
              <span className="text-xs font-bold text-emerald-500 font-mono flex items-center gap-1">
                <CheckCircle2 size={14} /> {statusEnv.apiKeyMasked}
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                <AlertTriangle size={14} /> Não detectada
              </span>
            )}
          </div>

          <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] flex items-center justify-between">
            <span className="font-mono text-xs text-foreground/70">BOLTEN_PROJECT_ID</span>
            {statusEnv?.projectId ? (
              <span className="text-xs font-bold text-emerald-500 font-mono flex items-center gap-1">
                <CheckCircle2 size={14} /> Configurado
              </span>
            ) : (
              <span className="text-xs text-foreground/40">Opcional / Vazio</span>
            )}
          </div>

          <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] flex items-center justify-between">
            <span className="font-mono text-xs text-foreground/70">BOLTEN_KANBAN_COMPONENT_ID</span>
            {statusEnv?.kanbanComponentId ? (
              <span className="text-xs font-bold text-emerald-500 font-mono flex items-center gap-1">
                <CheckCircle2 size={14} /> Configurado
              </span>
            ) : (
              <span className="text-xs text-foreground/40">Opcional / Vazio</span>
            )}
          </div>

          <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] flex items-center justify-between">
            <span className="font-mono text-xs text-foreground/70">BOLTEN_CONTACT_COMPONENT_ID</span>
            {statusEnv?.contactComponentId ? (
              <span className="text-xs font-bold text-emerald-500 font-mono flex items-center gap-1">
                <CheckCircle2 size={14} /> Configurado
              </span>
            ) : (
              <span className="text-xs text-foreground/40">Opcional / Vazio</span>
            )}
          </div>
        </div>
      </Panel>

      {/* Card 2: Teste de Conexão */}
      <Panel className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              Teste de Validação da Chave
            </h2>
            <p className="text-xs text-foreground/60 mt-0.5">
              Clique no botão para fazer uma requisição real à API da Bolten.io e validar suas credenciais.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            disabled={testando}
            onClick={handleTestarConexao}
            className="font-bold flex items-center justify-center gap-2 shrink-0 py-3 px-6 shadow-md"
          >
            {testando ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
            {testando ? 'Testando Conexão...' : 'Testar Conexão com Bolten.io'}
          </Button>
        </div>

        {/* Feedback do Teste */}
        {resultadoTeste && (
          <div className={`p-4 rounded-xl text-sm border flex items-start gap-3 mt-4 ${
            resultadoTeste.sucesso 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' 
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          }`}>
            {resultadoTeste.sucesso ? (
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            )}
            <div className="space-y-1.5 flex-1">
              <p className="font-bold text-sm">{resultadoTeste.mensagem}</p>
              {resultadoTeste.logs.length > 0 && (
                <ul className="list-disc list-inside text-xs space-y-1 opacity-90 font-mono pt-1">
                  {resultadoTeste.logs.map((log, i) => (
                    <li key={i}>{log}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* Card 3: Webhook do Salão */}
      <Panel className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={18} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Webhook para Receber Atualizações do Bolten</h3>
        </div>
        <p className="text-xs text-foreground/60 mb-3">
          Se você criar automações na Bolten.io que devem enviar dados de volta para o salão, use este endpoint:
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrlFull}
            className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-foreground font-mono select-all"
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0 text-xs font-bold"
            onClick={() => {
              navigator.clipboard.writeText(webhookUrlFull);
              setCopiadoWebhook(true);
              setTimeout(() => setCopiadoWebhook(false), 2500);
            }}
          >
            {copiadoWebhook ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copiadoWebhook ? 'Copiado!' : 'Copiar URL'}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
