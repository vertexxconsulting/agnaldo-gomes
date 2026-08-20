'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GitMerge, Settings, RefreshCw, PlusCircle, ExternalLink, AlertCircle,
  CheckCircle2, Loader2, Zap, ArrowRight, Eye, EyeOff, Copy, Bell,
} from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { boltenListOpportunities, demoOpportunities, type BoltenConfig } from '@/lib/bolten';

const CONFIG_STORAGE = 'bolten-config';
const ENV_BANNER = typeof window === 'undefined' ? false : false;

function loadConfig(): BoltenConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (!cfg.apiKey || !cfg.projectId) return null;
    return cfg as BoltenConfig;
  } catch {
    return null;
  }
}

function saveConfig(cfg: BoltenConfig | null) {
  if (cfg) localStorage.setItem(CONFIG_STORAGE, JSON.stringify(cfg));
  else localStorage.removeItem(CONFIG_STORAGE);
}

const STATUS_BADGE: Record<string, string> = {
  'novo': 'bg-[#0ea5e9]/15 text-[#0ea5e9]',
  'negociação': 'bg-warning/15 text-warning',
  'ganho': 'bg-success/15 text-success',
  'perdido': 'bg-error/15 text-error',
};

function statusBadge(status: string | undefined) {
  const s = (status ?? '').toLowerCase();
  const direct = STATUS_BADGE[s];
  if (direct) return direct;
  if (s.includes('novo') || s.includes('agendamento')) return STATUS_BADGE['novo'];
  if (s.includes('negoci') || s.includes('follow')) return STATUS_BADGE['negociação'];
  if (s.includes('concluí') || s.includes('ganho') || s.includes('done')) return STATUS_BADGE['ganho'];
  if (s.includes('perd')) return STATUS_BADGE['perdido'];
  return 'bg-foreground/10 text-foreground/60';
}

export default function BoltenCRMPage() {
  const [config, setConfig] = useState<BoltenConfig | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState<BoltenConfig>({ apiKey: '', projectId: '', kanbanComponentId: '', contactComponentId: '', webhookKey: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isDemo, setIsDemo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  useEffect(() => {
    if (!config) { setIsDemo(true); setOpportunities(demoOpportunities()); return; }
    setLoading(true);
    setError(null);
    boltenListOpportunities(config, config.kanbanComponentId, 1, 50).then((res) => {
      setLoading(false);
      if (res.error || !res.data) {
        setError(res.error ?? 'Não foi possível carregar as oportunidades.');
        setIsDemo(true);
        setOpportunities(demoOpportunities());
      } else {
        setIsDemo(false);
        setOpportunities(res.data.items ?? []);
      }
    });
  }, [config]);

  const handleSave = () => {
    setSaving(true);
    const cfg: BoltenConfig = { ...form };
    if (!cfg.webhookKey) cfg.webhookKey = '';
    saveConfig(cfg);
    setTimeout(() => {
      setSaving(false);
      setMode('view');
      setConfig(cfg);
    }, 400);
  };

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/bolten`;
  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const masked = (v: string) => (v ? v.slice(0, 6) + '••••••••' + v.slice(-4) : '');

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-2">Studio • Integração</p>
        <h1 className="text-2xl md:text-3xl font-serif font-bold flex items-center gap-3">
          <GitMerge className="text-primary" size={28} /> CRM Bolten
        </h1>
        <p className="text-foreground/60 mt-2 max-w-2xl">
          Conecte o funil de oportunidades da Bolten ao seu sistema: visualize leads, negócios e contatos
          diretamente no painel do Studio, com atualização em tempo real via webhooks.
        </p>
      </motion.div>

      {/* Configuração */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle title="Configuração da integração" subtitle={config ? 'Conectado — chaves configuradas' : 'Preencha as credenciais da sua conta Bolten'} align="left" size="sm" />
          <Button
            variant={mode === 'edit' ? 'secondary' : 'primary'}
            onClick={() => {
              if (mode === 'view') {
                setForm(config ?? { apiKey: '', projectId: '', kanbanComponentId: '', contactComponentId: '', webhookKey: '' });
                setMode('edit');
              } else handleSave();
            }}
            disabled={saving}
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : mode === 'edit' ? <><CheckCircle2 size={16} /> Salvar configuração</> : <><Settings size={16} /> {config ? 'Editar' : 'Configurar'}</>}
          </Button>
        </div>

        {mode === 'edit' ? (
          <CardGlass className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'apiKey', label: 'Chave de API (Bearer)', placeholder: 'Cole aqui sua API Key da Bolten', type: 'password' },
                { key: 'projectId', label: 'ID do Projeto', placeholder: 'UUID do projeto na Bolten', type: 'text' },
                { key: 'kanbanComponentId', label: 'ID do módulo Funil (Kanban)', placeholder: 'component_id do funil de oportunidades', type: 'text' },
                { key: 'contactComponentId', label: 'ID do módulo Contatos', placeholder: 'component_id do módulo de contatos', type: 'text' },
                { key: 'webhookKey', label: 'Chave secreta do Webhook (opcional)', placeholder: 'X-API-KEY para validar webhooks recebidos', type: 'password' },
              ].map((f) => {
                const Icon = f.type === 'password' ? (showKey ? EyeOff : Eye) : Zap;
                return (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/70">{f.label}</label>
                    <div className="relative">
                      <input
                        type={f.type === 'password' ? (showKey ? 'text' : 'password') : 'text'}
                        value={(form as any)[f.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-background/60 text-sm focus:outline-none focus:border-primary transition-colors"
                      />
                      {f.type === 'password' && (
                        <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground">
                          <Icon size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-foreground/50 flex items-start gap-1.5">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              Gere sua chave em <span className="font-semibold">Bolten &gt; Área do Parceiro &gt; API Keys</span>.
              O ID do projeto e os component_ids estão em <span className="font-semibold">Configurações do Projeto &gt; Integrações</span>.
              Use o endpoint <code className="px-1 rounded bg-foreground/10 font-mono">/schema</code> para descobrir os campos disponíveis do seu funil.
            </p>
          </CardGlass>
        ) : config ? (
          <CardGlass className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-1">Chave de API</p>
                <p className="font-mono text-xs">{showKey ? config.apiKey : masked(config.apiKey)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-1">Projeto</p>
                <p className="font-mono text-xs truncate">{config.projectId}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-1">Funil (Kanban)</p>
                <p className="font-mono text-xs truncate">{config.kanbanComponentId || 'não informado'}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-foreground/50">
              <Bell size={14} className="text-primary" />
              <span>Webhook ativo: eventos opportunity.created / .transitioned / .won / .lost são recebidos em <code className="px-1 rounded bg-foreground/10 font-mono">/api/webhooks/bolten</code></span>
            </div>
          </CardGlass>
        ) : (
          <CardGlass className="p-6 text-center">
            <GitMerge size={36} className="mx-auto text-primary/40 mb-3" />
            <p className="text-sm text-foreground/60">Integração ainda não configurada.</p>
            <p className="text-xs text-foreground/40 mt-1">Clique em “Configurar” para conectar sua conta Bolten. Enquanto isso, você vê dados de demonstração abaixo.</p>
          </CardGlass>
        )}
      </section>

      {/* Webhook setup */}
      <section>
        <SectionTitle title="Webhook de sincronização em tempo real" subtitle="Configure na Bolten para receber eventos do funil automaticamente" align="left" size="sm" />
        <CardGlass className="p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-foreground/50 mb-1">Endpoint</p>
              <p className="font-mono text-xs text-foreground/70 truncate">{webhookUrl}</p>
            </div>
            <Button variant="secondary" onClick={copyWebhook} size="sm">
              {copied ? <><CheckCircle2 size={14} /> Copiado!</> : <><Copy size={14} /> Copiar URL</>}
            </Button>
          </div>
          <p className="text-[11px] text-foreground/50 mt-3">
            Na Bolten, acesse <span className="font-semibold">Configurações &gt; Integrações &gt; Webhooks</span> no seu projeto,
            clique em “+ Webhook”, cole o endpoint acima, escolha os eventos (opportunity.created, opportunity.transitioned,
            opportunity.won, opportunity.lost) e, se definiu a Chave secreta, selecione autenticação por API Key.
          </p>
        </CardGlass>
      </section>

      {/* Pipeline */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle title="Funil de oportunidades" subtitle={isDemo ? 'Dados de demonstração — configure a integração para ver dados reais' : `${opportunities.length} oportunidade(s) sincronizada(s)`} align="left" size="sm" />
          {config && (
            <Link href="https://app.bolten.io" target="_blank">
              <span className="flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink size={12} /> Abrir Bolten</span>
            </Link>
          )}
        </div>
        {loading ? (
          <CardGlass className="p-10 text-center"><Loader2 size={24} className="mx-auto animate-spin text-primary" /><p className="text-xs text-foreground/50 mt-2">Sincronizando com a Bolten...</p></CardGlass>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {opportunities.map((opp, i) => {
              const attrs = opp.attributes ?? opp;
              const contato = attrs['Contato'] ?? {};
              return (
                <motion.div key={opp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <CardGlass className="p-4 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{attrs['Name'] ?? 'Sem nome'}</p>
                        <p className="text-[11px] text-foreground/50 truncate">
                          {(contato.Telefone ?? attrs['Telefone'] ?? '').toString().replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, '+$1 ($2) $3-$4') || (attrs['E-mail'] ?? 'sem contato')}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[9px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold ${statusBadge(attrs['Status'])}`}>
                        {attrs['Status'] ?? '—'}
                      </span>
                    </div>
                    <p className="text-[10px] text-foreground/40 mt-2">
                      {opp.created_at ? new Date(opp.created_at).toLocaleDateString('pt-BR') : ''} • Bolten ID: {opp.id.slice(0, 8)}…
                    </p>
                  </CardGlass>
                </motion.div>
              );
            })}
          </div>
        )}
        {error && (
          <p className="text-xs text-warning mt-3 flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>
        )}
        <p className="text-[10px] text-foreground/40 mt-3 flex items-center gap-1.5">
          <RefreshCw size={11} /> Sincronização sob rate limit da Bolten (1 req/s). Configure as chaves acima para ativar dados reais.
        </p>
      </section>
    </div>
  );
}
