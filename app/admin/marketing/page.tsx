'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cake, CalendarCheck, MessageCircleHeart, Clock3, Send, ExternalLink, RotateCcw } from 'lucide-react';
import { SectionHeader, Panel } from '@/components/ui/Panel';
import { Button } from '@/components/Button';

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
        if (!ultima) dias = null; // nunca veio
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ani, ag, reat, envStatus] = await Promise.all([
        carregarCron('/api/cron/aniversarios'),
        carregarCron('/api/cron/agenda'),
        carregarCron('/api/cron/reativacao'),
        fetch('/api/env-status').then(r => r.json()).catch(() => null),
      ]);
      setAniversarios(ani);
      setAgenda(ag);
      setReativacao(reat);
      setEvolutionOk(Boolean(envStatus?.evolutionApi));
      await carregarInativos();
      setLoading(false);
    })();
  }, [carregarCron, carregarInativos]);

  const reenviarTudo = async () => {
    setDisparando(true);
    const [ani, ag, reat] = await Promise.all([
      carregarCron('/api/cron/aniversarios'),
      carregarCron('/api/cron/agenda'),
      carregarCron('/api/cron/reativacao'),
    ]);
    setAniversarios(ani);
    setAgenda(ag);
    setReativacao(reat);
    setDisparando(false);
  };

  return (
    <div className="py-2 space-y-6">
      <SectionHeader
        eyebrow="WhatsApp & CRM · relacionamento com a cliente"
        title="Marketing & Mensagens"
action={
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/25">
                WhatsApp & Bolten CRM Integrados
              </span>
              <Button variant="outline" size="sm" onClick={reenviarTudo} disabled={disparando}>
                <Send size={14} className="mr-1" /> {disparando ? 'Atualizando...' : 'Rodar agora'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => carregarCron('/api/cron/reativacao').then(setReativacao)} disabled={disparando} className="hidden sm:flex">
                <RotateCcw size={14} className="mr-1" /> Reativação 90d
              </Button>
            </div>
          }
      />

      <p className="text-sm text-foreground/60 -mt-3">
        Disparo diário às <strong>08h</strong> (aniversários) e <strong>09h</strong> (confirmações e feedback).
        Use os botões verdes abaixo para enviar mensagens personalizadas diretamente pelo WhatsApp do Studio ou sincronizar com o Bolten.io.
      </p>

      {loading && <div className="text-center py-10 text-foreground/50">Carregando...</div>}

      {!loading && (
        <>
          {/* Aniversariantes */}
          <Panel title={`🎂 Aniversariantes de hoje (${aniversarios?.total ?? 0})`}
            action={aniversarios?.error ? <span className="text-xs text-danger">{aniversarios.error}</span> : undefined}>
            {(aniversarios?.itens?.length ?? 0) === 0 ? (
              <p className="text-sm text-foreground/50 py-3">Nenhum aniversário hoje.</p>
            ) : (
              <ul className="space-y-2">
                {aniversarios!.itens!.map((i, idx) => (
                  <li key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{i.nome || 'Sem nome'}</p>
                      <p className="text-xs text-foreground/50 truncate">{i.telefone || 'sem telefone'}</p>
                    </div>
                    {i.enviada_via_api ? (
                      <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-full border border-success/25">ENVIADA</span>
                    ) : i.wa_link ? (
                      <a href={i.wa_link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-success/30 text-success hover:bg-success/10 transition-colors">
                        <ExternalLink size={13} /> Enviar no WhatsApp
                      </a>
                    ) : (
                      <span className="text-[10px] text-foreground/40">—</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Confirmações + feedback */}
          <Panel title={`📅 Agenda de hoje e amanhã — confirmações (${agenda?.total ?? 0})`}
            action={agenda?.error ? <span className="text-xs text-danger">{agenda.error}</span> : undefined}>
            {(agenda?.itens?.length ?? 0) === 0 ? (
              <p className="text-sm text-foreground/50 py-3">Nada pendente para confirmar ou pedir feedback.</p>
            ) : (
              <ul className="space-y-2">
                {agenda!.itens!.map((i, idx) => {
                  const label = i.tipo === 'confirmacao_vespera' ? 'Véspera'
                    : i.tipo === 'lembrete_hoje' ? 'Hoje' : 'Feedback ontem';
                  return (
                    <li key={`${i.tipo}-${idx}`} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]">
                      <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${
                        i.tipo === 'feedback'
                          ? 'bg-primary/10 text-primary border-primary/25'
                          : 'bg-warning/10 text-warning border-warning/25'
                      }`}>{label}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{i.nome || 'Sem nome'}</p>
                        <p className="text-xs text-foreground/50 truncate">{i.telefone || 'sem telefone'}</p>
                      </div>
                      {i.enviada_via_api ? (
                        <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-full border border-success/25">ENVIADA</span>
                      ) : i.wa_link ? (
                        <a href={i.wa_link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-success/30 text-success hover:bg-success/10 transition-colors">
                          <ExternalLink size={13} /> Enviar
                        </a>
                      ) : (
                        <span className="text-[10px] text-foreground/40">—</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Reativação 90+ dias (Cron Mensal) */}
          <Panel title={`🔄 Reengajamento 90+ dias (${reativacao?.total ?? 0})`}
            action={reativacao?.error ? <span className="text-xs text-danger">{reativacao.error}</span> : undefined}>
            {(reativacao?.itens?.length ?? 0) === 0 ? (
              <p className="text-sm text-foreground/50 py-3">Nenhuma cliente para reengajar no momento (90+ dias sem atendimento concluído).</p>
            ) : (
              <ul className="space-y-2">
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
                      <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-full border border-success/25">ENVIADA</span>
                    ) : i.wa_link ? (
                      <a href={i.wa_link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                        <MessageCircleHeart size={13} /> Enviar Reativação
                      </a>
                    ) : (
                      <span className="text-[10px] text-foreground/40">—</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Clientes inativos */}
          <Panel title={`💤 Não aparecem há ${DIAS_INATIVO}+ dias (${inativos.length})`}>
            {inativos.length === 0 ? (
              <p className="text-sm text-foreground/50 py-3">Nenhuma cliente inativa no momento. 🎉</p>
            ) : (
              <ul className="space-y-2">
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
        </>
      )}
    </div>
  );
}

function BotaoReativar({ nome, telefone, dias }: { nome: string; telefone: string; dias: number | null }) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { msgReativacao, normalizarTelefone, waMeLink } = await import('@/lib/mensagens');
      const num = normalizarTelefone(telefone);
      if (!num) return;
      setUrl(waMeLink(num, msgReativacao(nome, dias ?? DIAS_INATIVO)));
    })();
  }, [nome, telefone, dias]);

  if (!url) return <span className="text-[10px] text-foreground/40">—</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-success/30 text-success hover:bg-success/10 transition-colors">
      <MessageCircleHeart size={13} /> Chamar de volta
    </a>
  );
}
