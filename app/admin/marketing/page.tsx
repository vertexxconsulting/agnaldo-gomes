'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cake, CalendarCheck, MessageCircleHeart, Clock3, Send, ExternalLink, RotateCcw, Star, Activity, AlertCircle, MessageCircle } from 'lucide-react';
import { SectionHeader, Panel } from '@/components/ui/Panel';
import { Button } from '@/components/Button';
import { CardGlass } from '@/components/CardGlass';
import { RegrasMarketing } from './RegrasMarketing';

type ItemMsg = {
  tipo: string;
  nome: string | null;
  telefone: string;
  mensagem: string;
  wa_link: string;
  enviada_via_api: boolean;
  diasDesdeUltima?: number | null;
};

interface RespostaCron {
  ok: boolean;
  total?: number;
  evolution_conectada?: boolean;
  enviados_automaticos?: number;
  itens?: ItemMsg[];
  error?: string;
}

interface ClienteInativo {
  id: string;
  nome: string;
  telefone: string;
  diasDesdeUltima: number | null;
}

const DIAS_INATIVO = 60;

export default function MarketingPage() {
  const [aniversarios, setAniversarios] = useState<RespostaCron | null>(null);
  const [agenda, setAgenda] = useState<RespostaCron | null>(null);
  const [reativacao, setReativacao] = useState<RespostaCron | null>(null);
  const [feedback, setFeedback] = useState<RespostaCron | null>(null);
  const [inativos, setInativos] = useState<ClienteInativo[]>([]);
  const [evolutionOk, setEvolutionOk] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [disparando, setDisparando] = useState(false);

  const carregarCron = useCallback(async (url: string): Promise<RespostaCron | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return await res.json();
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }, []);

  const carregarInativos = useCallback(async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const [clientesRes, agsRes] = await Promise.all([
        supabase.from('salon_customers').select('id, name, phone'),
        supabase.from('salon_appointments').select('customer_id, date').order('date', { ascending: false }),
      ]);
      const clientes = clientesRes.data ?? [];
      const ultimaPorCliente = new Map<string, string>();
      for (const a of agsRes.data ?? []) {
        if (!a.customer_id) continue;
        const atual = ultimaPorCliente.get(a.customer_id);
        if (!atual || a.date > atual) ultimaPorCliente.set(a.customer_id, a.date as string);
      }
      const agora = Date.now();
      const lista: ClienteInativo[] = [];
      for (const c of clientes) {
        const ultima = ultimaPorCliente.get(c.id);
        let dias: number | null;
        if (!ultima) dias = null;
        else dias = Math.floor((agora - new Date(`${ultima}T12:00:00`).getTime()) / (24 * 3600 * 1000));
        if (dias === null || dias >= DIAS_INATIVO) {
          lista.push({
            id: c.id,
            nome: c.name ?? '',
            telefone: c.phone ?? '',
            diasDesdeUltima: dias,
          });
        }
      }
      lista.sort((a, b) => (b.diasDesdeUltima ?? 9999) - (a.diasDesdeUltima ?? 9999));
      setInativos(lista.slice(0, 30));
    } catch {
      setInativos([]);
    }
  }, []);

  const checkApiStatus = async () => {
    try {
      const res = await fetch('/api/env-status');
      const data = await res.json();
      setEvolutionOk(Boolean(data?.evolutionApi));
    } catch {
      setEvolutionOk(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await checkApiStatus();
      const [ani, ag, reat, fb] = await Promise.all([
        carregarCron('/api/cron/aniversarios'),
        carregarCron('/api/cron/agenda'),
        carregarCron('/api/cron/reativacao'),
        carregarCron('/api/cron/feedback'),
      ]);
      setAniversarios(ani);
      setAgenda(ag);
      setReativacao(reat);
      setFeedback(fb);
      await carregarInativos();
      setLoading(false);
    })();
  }, [carregarCron, carregarInativos]);

  const reenviarTudo = async () => {
    setDisparando(true);
    try {
      const [ani, ag, reat, fb] = await Promise.all([
        carregarCron('/api/cron/aniversarios'),
        carregarCron('/api/cron/agenda'),
        carregarCron('/api/cron/reativacao'),
        carregarCron('/api/cron/feedback'),
      ]);
      setAniversarios(ani);
      setAgenda(ag);
      setReativacao(reat);
      setFeedback(fb);
      await checkApiStatus();
    } finally {
      setDisparando(false);
    }
  };

  return (
    <div className="py-2 space-y-6">
      <SectionHeader
        eyebrow="WhatsApp & CRM · relacionamento com a cliente"
        title="Marketing & Mensagens"
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white/5 text-xs font-medium transition-all">
              {evolutionOk ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-success">Evolution API Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                  <span className="text-danger">Evolution API Offline</span>
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={reenviarTudo} disabled={disparando}>
              <Send size={14} className="mr-1" /> {disparando ? 'Processando...' : 'Rodar Agora'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => carregarCron('/api/cron/reativacao').then(setReativacao)} disabled={disparando} className="hidden sm:flex">
              <RotateCcw size={14} className="mr-1" /> Reativação 90d
            </Button>
          </div>
        }
      />

      <p className="text-sm text-foreground/60 -mt-3">
        Disparo diário às <strong className="text-foreground">08h</strong> (aniversários) e <strong className="text-foreground">09h</strong> (confirmações e feedback).<br/>
        <span className="opacity-70">Se a API estiver Online, as mensagens são disparadas automaticamente. Caso contrário, use os links de envio manual.</span>
      </p>

      {loading && <div className="text-center py-10 text-foreground/50">Carregando painel de marketing...</div>}

      {!loading && (
        <div className="space-y-6">
          {/* REGRAS PERSONALIZADAS NO TOPO */}
          <RegrasMarketing />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUNA 1: OPERAÇÕES DIÁRIAS */}
            <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 px-2 flex items-center gap-2">
              <Activity size={14} /> Operações Diárias
            </h3>

            <MarketingWidget 
              title={`🎂 Aniversariantes (${aniversarios?.total ?? 0})`}
              data={aniversarios} 
              icon={<Cake size={16} />}
            />

            <MarketingWidget 
              title={`📅 Agenda & Confirmações (${agenda?.total ?? 0})`}
              data={agenda} 
              icon={<CalendarCheck size={16} />}
              typeLabel={(i) => i.tipo === 'confirmacao_vespera' ? 'Véspera' : i.tipo === 'lembrete_hoje' ? 'Hoje' : 'Feedback'}
            />

            <MarketingWidget 
              title={`⭐ Feedbacks (${feedback?.total ?? 0})`}
              data={feedback} 
              icon={<Star size={16} />}
              isFeedback
            />
          </div>

          {/* COLUNA 2: RECUPERAÇÃO E RETENÇÃO */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 px-2 flex items-center gap-2">
              <RotateCcw size={14} /> Recuperação & Retenção
            </h3>

            <Panel title={`🔄 Reengajamento 90+ dias (${reativacao?.total ?? 0})`}
              action={reativacao?.error ? <span className="text-xs text-danger">{reativacao.error}</span> : undefined}>
              {(reativacao?.itens?.length ?? 0) === 0 ? (
                <p className="text-sm text-foreground/50 py-3">Nenhuma cliente para reengajar no momento.</p>
              ) : (
                <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {reativacao!.itens!.map((i, idx) => (
                    <li key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{i.nome || 'Sem nome'}</p>
                        <p className="text-xs text-foreground/50 truncate">
                          {i.diasDesdeUltima === null ? 'Nunca frequentou' : `Última visita há ${i.diasDesdeUltima} dias`}
                          {' · '}
                          {i.telefone || 'sem telefone'}
                        </p>
                      </div>
                      {i.enviada_via_api ? (
                        <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-full border border-success/25">ENVIADA AUTO</span>
                      ) : i.wa_link ? (
                        <a href={i.wa_link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors">
                          <MessageCircleHeart size={13} /> Reativar
                        </a>
                      ) : (
                        <span className="text-[10px] text-foreground/40">—</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={`💤 Inativas há ${DIAS_INATIVO}+ dias (${inativos.length})`}>
              {inativos.length === 0 ? (
                <p className="text-sm text-foreground/50 py-3">Nenhuma cliente inativa no momento. 🎉</p>
              ) : (
                <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {inativos.map(c => (
                    <li key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]">
                      <Clock3 size={16} className="text-foreground/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.nome || 'Sem nome'}</p>
                        <p className="text-xs text-foreground/50">
                          {c.diasDesdeUltima === null ? 'Nunca frequentou' : `Última visita há ${c.diasDesdeUltima} dias`}
                          {' · '}
                          {c.telefone || 'sem telefone'}
                        </p>
                      </div>
                      <BotaoReativar nome={c.nome} telefone={c.telefone} dias={c.diasDesdeUltima} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

function MarketingWidget({ title, data, icon, typeLabel, isFeedback }: { title: string, data: RespostaCron | null, icon: React.ReactNode, typeLabel?: (i: any) => string, isFeedback?: boolean }) {
  return (
    <Panel title={title} action={data?.error ? <span className="text-xs text-danger">{data.error}</span> : undefined}>
      {(data?.itens?.length ?? 0) === 0 ? (
        <p className="text-sm text-foreground/50 py-3">Nenhum item encontrado para hoje.</p>
      ) : (
        <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {data!.itens!.map((i, idx) => (
            <li key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isFeedback && <Star size={14} className="text-amber-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{i.nome || 'Sem nome'}</p>
                  <p className="text-xs text-foreground/50 truncate">
                    {isFeedback ? ((i as any).servico ? `${(i as any).servico} · ` : '') : ''}
                    {i.telefone || 'sem telefone'}
                  </p>
                </div>
              </div>
              {i.enviada_via_api ? (
                <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-full border border-success/25">AUTO</span>
              ) : i.wa_link ? (
                <a href={i.wa_link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-success/30 text-success hover:bg-success/10 transition-colors">
                  <ExternalLink size={13} /> Enviar
                </a>
              ) : (
                <span className="text-[10px] text-foreground/40">—</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function BotaoReativar({ nome, telefone, dias }: { nome: string; telefone: string; dias: number | null }) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { msgReativacao, normalizarTelefone, waMeLink } = await import('@/lib/mensagens');
      const num = normalizarTelefone(telefone);
      if (!num) return;
      setUrl(waMeLink(num, await msgReativacao(nome, dias ?? DIAS_INATIVO)));
    })();
  }, [nome, telefone, dias]);

  if (!url) return <span className="text-[10px] text-foreground/40">—</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-success/30 text-success hover:bg-success/10 transition-colors">
      <MessageCircle size={13} /> Chamar
    </a>
  );
}
