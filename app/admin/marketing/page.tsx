'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Cake, CalendarCheck, MessageCircleHeart, Clock3, Send, 
  ExternalLink, RotateCcw, Star, Activity, AlertCircle, MessageCircle, QrCode, Play
} from 'lucide-react';
import { SectionHeader, Panel } from '@/components/ui/Panel';
import { Button } from '@/components/Button';
import { CardGlass } from '@/components/CardGlass';
import { RegrasMarketing } from './RegrasMarketing';
import { ConfiguracaoAutomacao } from './ConfiguracaoAutomacao';
import { toast } from 'sonner';

type ItemMsg = {
  id?: string;
  tipo: string;
  chaveUnica?: string;
  nome: string | null;
  telefone: string;
  mensagem: string;
  wa_link: string;
  enviada_via_api: boolean;
  ja_enviado_hoje?: boolean;
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
  const [waStatus, setWaStatus] = useState<{
    online: boolean;
    conectado: boolean;
    state: string;
  }>({ online: false, conectado: false, state: 'loading' });
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
        supabase.from('salon_appointments').select('customer_id, date, status').in('status', ['COMPLETED', 'CONFIRMED']).order('date', { ascending: false }),
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
        if (!ultima) continue;
        const dias = Math.floor((agora - new Date(`${ultima}T12:00:00`).getTime()) / (24 * 3600 * 1000));
        if (dias >= DIAS_INATIVO) {
          lista.push({
            id: c.id,
            nome: c.name ?? '',
            telefone: c.phone ?? '',
            diasDesdeUltima: dias,
          });
        }
      }
      lista.sort((a, b) => (b.diasDesdeUltima ?? 0) - (a.diasDesdeUltima ?? 0));
      setInativos(lista.slice(0, 30));
    } catch {
      setInativos([]);
    }
  }, []);

  const checkApiStatus = async () => {
    try {
      const res = await fetch('/api/env-status');
      const data = await res.json();
      setWaStatus({
        online: Boolean(data?.evolutionApi),
        conectado: Boolean(data?.whatsappConnected),
        state: data?.whatsappState || 'close',
      });
    } catch {
      setWaStatus({ online: false, conectado: false, state: 'offline' });
    }
  };

  const carregarTudo = useCallback(async () => {
    await checkApiStatus();
    // Chamadas com ?preview=true para alimentar a listagem sem disparos automáticos
    const [ani, ag, reat, fb] = await Promise.all([
      carregarCron('/api/cron/aniversarios?preview=true'),
      carregarCron('/api/cron/agenda?preview=true'),
      carregarCron('/api/cron/reativacao?preview=true'),
      carregarCron('/api/cron/feedback?preview=true'),
    ]);
    setAniversarios(ani);
    setAgenda(ag);
    setReativacao(reat);
    setFeedback(fb);
    await carregarInativos();
  }, [carregarCron, carregarInativos]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await carregarTudo();
      setLoading(false);
    })();
  }, [carregarTudo]);

  // Função central para registrar envio manual (WhatsApp Web) e atualizar cards instantaneamente
  const handleEnviarManual = async (item: ItemMsg) => {
    if (!item.wa_link) return;
    window.open(item.wa_link, '_blank', 'noopener,noreferrer');

    if (item.chaveUnica) {
      // 1. Atualizar UI imediatamente em todos os quadros
      const atualizarLista = (prev: RespostaCron | null): RespostaCron | null => {
        if (!prev || !prev.itens) return prev;
        return {
          ...prev,
          itens: prev.itens.map(it =>
            it.chaveUnica === item.chaveUnica || (it.telefone === item.telefone && it.tipo === item.tipo)
              ? { ...it, ja_enviado_hoje: true, enviada_via_api: true }
              : it
          ),
        };
      };

      setAniversarios(atualizarLista);
      setAgenda(atualizarLista);
      setFeedback(atualizarLista);
      setReativacao(atualizarLista);

      // 2. Persistir no banco de dados para proteção anti-duplicação
      try {
        await fetch('/api/admin/marketing/registrar-disparo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chaveUnica: item.chaveUnica }),
        });
        toast.success(`Disparo para ${item.nome || 'cliente'} registrado! Não será reenviado hoje.`);
      } catch (err) {
        console.error('Erro ao registrar disparo:', err);
      }
    }
  };

  const dispararFilaAtiva = async () => {
    if (!waStatus.conectado) {
      toast.error('O WhatsApp está desconectado! Acesse "Conectar WhatsApp" para ler o QR Code antes de disparar.');
      return;
    }

    if (!confirm('Atenção: O sistema irá disparar as mensagens das sessões que estiverem marcadas como "ATIVO", aplicando intervalo de segurança de pelo menos 1 minuto entre cada mensagem para proteger seu WhatsApp contra ban.\n\nDeseja iniciar?')) {
      return;
    }
    setDisparando(true);
    toast.info('Ciclo de disparos iniciado em segundo plano com intervalo seguro de 1 minuto!');
    try {
      const res = await fetch('/api/cron/dispatcher?force=true');
      const data = await res.json();
      if (res.ok) {
        toast.success('Disparos finalizados com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao processar disparos.');
      }
      await carregarTudo();
    } catch (e: any) {
      toast.error(`Falha no processamento: ${e.message}`);
    } finally {
      setDisparando(false);
    }
  };

  const dispararLembretesHoje = async () => {
    if (!waStatus.conectado) {
      toast.error('O WhatsApp está desconectado! Acesse "Conectar WhatsApp" para ler o QR Code antes de disparar.');
      return;
    }

    if (!confirm('Deseja disparar agora os lembretes de horário via WhatsApp para os clientes com agendamento HOJE?\n\n• As mensagens serão disparadas imediatamente, mesmo que antes do horário padrão configurado.\n• Clientes que já receberam mensagem hoje não receberão novamente (proteção anti-duplicação).\n• Intervalo seguro anti-ban de 1 min entre envios.')) {
      return;
    }
    setDisparando(true);
    toast.info('Ciclo de disparos de lembretes do dia iniciado!');
    try {
      const res = await fetch('/api/cron/agenda?execute=true&force=true&tipo=lembrete_hoje');
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.enviados_automaticos > 0) {
          toast.success(`${data.enviados_automaticos} lembrete(s) de hoje enviado(s) com sucesso!`);
        } else if ((data.itens?.length ?? 0) === 0) {
          toast.info('Nenhum agendamento ativo encontrado para o dia de hoje.');
        } else {
          toast.info('Todos os lembretes de hoje já haviam sido enviados anteriormente (anti-duplicação).');
        }
      } else {
        toast.error(data.error || 'Erro ao processar disparos de lembretes.');
      }
      await carregarTudo();
    } catch (e: any) {
      toast.error(`Falha no processamento: ${e.message}`);
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
            <Link href="/admin/api">
              <Button variant="outline" size="sm" className="border-gold/40 text-gold hover:bg-gold/10">
                <QrCode size={14} className="mr-1.5" /> Conectar WhatsApp
              </Button>
            </Link>
            <Link href="/admin/api" title="Clique para gerenciar conexão do WhatsApp">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer hover:opacity-85 ${
                waStatus.conectado
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : waStatus.state === 'connecting'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}>
                {waStatus.conectado ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold">WhatsApp Conectado</span>
                  </>
                ) : waStatus.state === 'connecting' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="font-bold">Aguardando QR Code</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="font-bold">WhatsApp Desconectado</span>
                  </>
                )}
              </div>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={dispararFilaAtiva}
              disabled={disparando}
              className="font-bold shadow-md shadow-gold/10"
            >
              <Send size={14} className="mr-1.5" />
              {disparando ? 'Disparando (1 min/msg)...' : 'Disparar Fila Ativa'}
            </Button>
          </div>
        }
      />

      {loading && <div className="text-center py-10 text-foreground/50">Carregando painel de marketing...</div>}

      {!loading && (
        <div className="space-y-6">
          {/* TRAVAS DE DISPARO E HORÁRIOS POR SESSÃO */}
          <ConfiguracaoAutomacao onConfigSaved={carregarTudo} />

          {/* REGRAS PERSONALIZADAS E TEMPLATES */}
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
                onEnviarManual={handleEnviarManual}
              />

              <MarketingWidget 
                title={`📅 Agenda & Confirmações (${agenda?.total ?? 0})`}
                data={agenda} 
                icon={<CalendarCheck size={16} />}
                typeLabel={(i) => i.tipo === 'confirmacao_vespera' ? 'Véspera' : i.tipo === 'lembrete_hoje' ? 'Hoje' : 'Feedback'}
                onEnviarManual={handleEnviarManual}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disparando}
                    onClick={dispararLembretesHoje}
                    className="text-[11px] h-7 px-2.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold"
                    title="Disparar lembretes dos agendamentos de hoje pelo WhatsApp agora"
                  >
                    <Clock3 size={12} className="mr-1" />
                    Disparar Lembretes de Hoje
                  </Button>
                }
              />

              <MarketingWidget 
                title={`⭐ Feedbacks (${feedback?.total ?? 0})`}
                data={feedback} 
                icon={<Star size={16} />}
                isFeedback
                onEnviarManual={handleEnviarManual}
              />
            </div>

            {/* COLUNA 2: RECUPERAÇÃO E RETENÇÃO */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 px-2 flex items-center gap-2">
                <RotateCcw size={14} /> Recuperação & Retenção
              </h3>

              <Panel 
                title={`🔄 Reengajamento 90+ dias (${reativacao?.total ?? 0})`}
                action={reativacao?.error ? <span className="text-xs text-danger">{reativacao.error}</span> : undefined}
              >
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
                        {i.ja_enviado_hoje || i.enviada_via_api ? (
                          <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30 whitespace-nowrap">
                            ENVIADA HOJE
                          </span>
                        ) : i.wa_link ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                              PENDENTE
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEnviarManual(i)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors cursor-pointer"
                            >
                              <MessageCircleHeart size={13} /> Chamar
                            </button>
                          </div>
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
                        <BotaoReativar id={c.id} nome={c.nome} telefone={c.telefone} dias={c.diasDesdeUltima} />
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

function MarketingWidget({ 
  title, 
  data, 
  icon, 
  typeLabel, 
  isFeedback,
  action,
  onEnviarManual,
}: { 
  title: string, 
  data: RespostaCron | null, 
  icon: React.ReactNode, 
  typeLabel?: (i: any) => string, 
  isFeedback?: boolean,
  action?: React.ReactNode,
  onEnviarManual?: (i: ItemMsg) => void,
}) {
  return (
    <Panel 
      title={title} 
      action={
        <div className="flex items-center gap-2">
          {action}
          {data?.error ? <span className="text-xs text-danger">{data.error}</span> : null}
        </div>
      }
    >
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
              {i.ja_enviado_hoje || i.enviada_via_api ? (
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30 whitespace-nowrap">
                  ENVIADA HOJE
                </span>
              ) : i.wa_link ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap">
                    AGUARDANDO
                  </span>
                  <button
                    type="button"
                    onClick={() => onEnviarManual?.(i)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors cursor-pointer"
                  >
                    <ExternalLink size={12} /> Enviar
                  </button>
                </div>
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

function BotaoReativar({ id, nome, telefone, dias }: { id: string; nome: string; telefone: string; dias: number | null }) {
  const [url, setUrl] = useState<string>('');
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    (async () => {
      const { msgReativacao, normalizarTelefone, waMeLink } = await import('@/lib/mensagens');
      const num = normalizarTelefone(telefone);
      if (!num) return;
      setUrl(waMeLink(num, await msgReativacao(nome, dias ?? DIAS_INATIVO)));
    })();
  }, [nome, telefone, dias]);

  const handleEnviar = async () => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    setEnviado(true);
    const chaveUnica = `reativacao:${id}`;
    try {
      await fetch('/api/admin/marketing/registrar-disparo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chaveUnica }),
      });
      toast.success(`Mensagem para ${nome || 'cliente'} registrada como enviada!`);
    } catch (e) {
      console.error(e);
    }
  };

  if (!url) return <span className="text-[10px] text-foreground/40">—</span>;
  if (enviado) {
    return (
      <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30 whitespace-nowrap">
        ENVIADA HOJE
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleEnviar}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors cursor-pointer"
    >
      <MessageCircle size={13} /> Chamar
    </button>
  );
}
