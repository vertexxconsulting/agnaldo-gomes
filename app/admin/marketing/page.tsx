'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Cake, CalendarCheck, MessageCircleHeart, Clock3, Send, 
  ExternalLink, RotateCcw, Star, Activity, AlertCircle, AlertTriangle, 
  MessageCircle, QrCode, Play, Plus, X, CheckCircle2, Clock, 
  Sliders, MessageSquareQuote, CalendarDays, Phone, User2, RefreshCw, Scissors, Sparkles
} from 'lucide-react';
import { SectionHeader, Panel } from '@/components/ui/Panel';
import { ReadOnlyNotice } from '@/components/ReadOnlyNotice';
import { useModulePermission } from '@/lib/use-module-permission';
import { Button } from '@/components/Button';
import { CardGlass } from '@/components/CardGlass';
import { RegrasMarketing } from './RegrasMarketing';
import { ConfiguracaoAutomacao } from './ConfiguracaoAutomacao';
import { ModalServicosFeedback } from './ModalServicosFeedback';
import { toast } from 'sonner';

export type SubAbaMarketing = 'operacoes' | 'feedbacks' | 'recuperacao' | 'regras' | 'automacao';

type ItemMsg = {
  id?: string;
  cliente_id?: string | null;
  tipo: string;
  chaveUnica?: string;
  nome: string | null;
  telefone: string;
  telefone_original?: string | null;
  hora?: string;
  data?: string;
  servico?: string | null;
  profissional?: string | null;
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

export default function MensagensWhatsAppPage() {
  const { isReadOnly } = useModulePermission('marketing');
  const [abaAtiva, setAbaAtiva] = useState<SubAbaMarketing>('operacoes');

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

  // Modal para cadastro rápido de telefone de clientes sem número
  const [clienteEditandoTelefone, setClienteEditandoTelefone] = useState<{
    clienteId?: string | null;
    nome: string;
  } | null>(null);
  const [novoTelefone, setNovoTelefone] = useState('');
  const [salvandoTelefone, setSalvandoTelefone] = useState(false);

  // Modal de serviços de feedback
  const [modalFeedbackAberto, setModalFeedbackAberto] = useState(false);

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

  // Função central para envio manual (WhatsApp Web)
  const handleEnviarManual = async (item: ItemMsg) => {
    if (isReadOnly) {
      toast.error('Ação bloqueada: seu perfil possui permissão somente de leitura em Marketing.');
      return;
    }
    if (!item.wa_link) {
      if (!item.telefone) {
        toast.error(`A cliente ${item.nome || ''} não possui telefone cadastrado.`);
      }
      return;
    }
    window.open(item.wa_link, '_blank', 'noopener,noreferrer');

    if (item.chaveUnica) {
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

  // Salvar novo telefone para cliente sem número
  const handleSalvarTelefoneCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error('Ação bloqueada: seu perfil possui permissão somente de leitura em Marketing.');
      return;
    }
    if (!clienteEditandoTelefone || !novoTelefone.trim()) return;

    if (!clienteEditandoTelefone.clienteId) {
      toast.error('ID da cliente não identificado.');
      return;
    }

    setSalvandoTelefone(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clienteEditandoTelefone.clienteId,
          telefone: novoTelefone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao salvar telefone.');
      }

      toast.success(`Telefone de ${clienteEditandoTelefone.nome} cadastrado com sucesso!`);
      setClienteEditandoTelefone(null);
      setNovoTelefone('');

      await carregarTudo();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao salvar telefone.');
    } finally {
      setSalvandoTelefone(false);
    }
  };

  // Disparo automático genérico
  const executarDisparoAutomatico = async (
    urlEndpoint: string,
    tituloOperacao: string,
    confirmacaoTexto: string
  ) => {
    if (isReadOnly) {
      toast.error('Ação bloqueada: seu perfil possui permissão somente de leitura em Marketing.');
      return;
    }
    if (!waStatus.conectado) {
      toast.error('O WhatsApp está desconectado! Conecte via QR Code antes de disparar.');
      return;
    }

    if (!confirm(confirmacaoTexto)) return;

    setDisparando(true);
    toast.info(`Iniciando disparos automáticos de ${tituloOperacao}...`);

    try {
      const res = await fetch(urlEndpoint);
      const data = await res.json();

      if (res.ok && data.ok) {
        if (data.enviados_automaticos > 0) {
          toast.success(`${data.enviados_automaticos} mensagem(ns) enviada(s) com sucesso!`);
        } else if ((data.itens?.length ?? 0) === 0) {
          toast.info(`Nenhum registro encontrado para envio em ${tituloOperacao}.`);
        } else {
          toast.info('Todas as mensagens desta lista já haviam sido enviadas hoje (proteção anti-duplicação).');
        }
      } else {
        toast.error(data.error || `Erro ao processar disparos de ${tituloOperacao}.`);
      }
      await carregarTudo();
    } catch (e: any) {
      toast.error(`Falha no processamento: ${e.message}`);
    } finally {
      setDisparando(false);
    }
  };

  // Disparos automáticos específicos
  const dispararAutomaticoLembretes = () => {
    executarDisparoAutomatico(
      '/api/cron/agenda?execute=true&force=true&tipo=lembrete_hoje',
      'Lembretes de Hoje',
      'Deseja disparar agora de forma automática os Lembretes de Horário para os agendamentos de HOJE?\n\n• Serão enviados via WhatsApp para as clientes agendadas hoje.\n• Clientes já notificadas hoje não receberão novamente.\n• Intervalo seguro de segurança anti-ban entre mensagens.'
    );
  };

  const dispararAutomaticoConfirmacoes = () => {
    executarDisparoAutomatico(
      '/api/cron/agenda?execute=true&force=true&tipo=confirmacao_vespera',
      'Confirmações de Amanhã',
      'Deseja disparar agora de forma automática as Confirmações de Agendamento para AMANHÃ?\n\n• As mensagens serão disparadas imediatamente via WhatsApp.\n• Não enviará em duplicidade para quem já recebeu hoje.\n• Intervalo seguro anti-ban entre envios.'
    );
  };

  const dispararAutomaticoAniversarios = () => {
    executarDisparoAutomatico(
      '/api/cron/aniversarios?execute=true&force=true',
      'Felicitações de Aniversário',
      'Deseja disparar agora de forma automática as mensagens de Feliz Aniversário para as clientes aniversariantes de hoje?'
    );
  };

  const dispararAutomaticoFeedbacks = () => {
    executarDisparoAutomatico(
      '/api/cron/feedback?execute=true&force=true',
      'Feedbacks Pós-Atendimento',
      'Deseja disparar agora as mensagens de feedback para as clientes com serviços concluídos?'
    );
  };

  const dispararFilaCompletaHoje = () => {
    executarDisparoAutomatico(
      '/api/cron/dispatcher?force=true',
      'Fila Diária Completa',
      'Atenção: O sistema irá disparar as mensagens de todas as sessões ativas do dia (Lembretes, Confirmações, Aniversários e Feedbacks elegíveis).\n\n• Intervalo seguro anti-ban de 1 min entre mensagens.\n\nDeseja iniciar?'
    );
  };

  // Separação dos agendamentos em listas distintas e ordenadas por horário de agendamento
  const lembretesHoje = useMemo(() => {
    const list = (agenda?.itens ?? []).filter(i => i.tipo === 'lembrete_hoje');
    return [...list].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  }, [agenda]);

  const confirmacoesVespera = useMemo(() => {
    const list = (agenda?.itens ?? []).filter(i => i.tipo === 'confirmacao_vespera');
    return [...list].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  }, [agenda]);

  const aniversariantesHoje = useMemo(() => {
    return aniversarios?.itens ?? [];
  }, [aniversarios]);

  const feedbacksRecentes = useMemo(() => {
    return feedback?.itens ?? [];
  }, [feedback]);

  // Contadores para as badges das sub-abas
  const totalOperacoes = lembretesHoje.length + confirmacoesVespera.length + aniversariantesHoje.length;
  const totalFeedbacks = feedbacksRecentes.length;
  const totalRecuperacao = (reativacao?.itens?.length ?? 0) + inativos.length;

  const ABAS: Array<{
    id: SubAbaMarketing;
    label: string;
    icon: any;
    badge?: number;
  }> = [
    { id: 'operacoes', label: 'Operações Diárias', icon: CalendarCheck, badge: totalOperacoes },
    { id: 'feedbacks', label: 'Feedbacks Pós-Atendimento', icon: Star, badge: totalFeedbacks },
    { id: 'recuperacao', label: 'Recuperação & Retenção', icon: RotateCcw, badge: totalRecuperacao },
    { id: 'regras', label: 'Regras & Mensagens', icon: MessageSquareQuote },
    { id: 'automacao', label: 'Horários & Automação', icon: Sliders },
  ];

  return (
    <div className="py-2 space-y-6">
      {/* CABEÇALHO DA PÁGINA */}
      <SectionHeader
        eyebrow="WhatsApp & CRM · relacionamento com a cliente"
        title="Mensagens WhatsApp"
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

            {!isReadOnly && (
              <Button
                variant="primary"
                size="sm"
                onClick={dispararFilaCompletaHoje}
                disabled={disparando}
                className="font-bold shadow-md shadow-gold/10"
                title="Disparar todas as mensagens elegíveis do dia em segundo plano"
              >
                <Send size={14} className="mr-1.5" />
                {disparando ? 'Disparando...' : 'Disparar Fila do Dia'}
              </Button>
            )}
          </div>
        }
      />

      {isReadOnly && <ReadOnlyNotice modulo="Marketing e WhatsApp" />}

      {/* BARRA DE SUB-ABAS DE NAVEGAÇÃO */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3 overflow-x-auto custom-scrollbar">
        {ABAS.map(aba => {
          const Icone = aba.icon;
          const ativo = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                ativo
                  ? 'bg-gold text-white shadow-md shadow-gold/20'
                  : 'bg-foreground/[0.03] text-foreground/70 hover:bg-foreground/[0.07] hover:text-foreground border border-[var(--border-subtle)]'
              }`}
            >
              <Icone size={15} />
              <span>{aba.label}</span>
              {typeof aba.badge === 'number' && aba.badge > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  ativo ? 'bg-white/25 text-white' : 'bg-gold/15 text-gold border border-gold/30'
                }`}>
                  {aba.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && <div className="text-center py-10 text-foreground/50">Carregando painel de mensagens...</div>}

      {!loading && (
        <div>
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SUB-ABA 1: OPERAÇÕES DIÁRIAS (LEMBRETES, CONFIRMAÇÕES, ANIVERSÁRIOS) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'operacoes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Activity size={16} className="text-gold" /> Fila Diária de Disparos
                  </h3>
                  <p className="text-xs text-foreground/55 mt-0.5">
                    Envie lembretes e confirmações por WhatsApp em ordem de horário ou dispare automaticamente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disparando}
                    onClick={carregarTudo}
                    className="text-xs"
                    title="Atualizar dados da fila"
                  >
                    <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={disparando}
                    onClick={dispararFilaCompletaHoje}
                    className="text-xs font-bold"
                  >
                    <Play size={13} className="mr-1.5" />
                    Disparar Tudo Hoje
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CARD 1: LEMBRETES DO DIA DE HOJE (ORDEM DE AGENDAMENTO) */}
                <Panel
                  title={`⏰ Lembretes do Dia de Hoje (${lembretesHoje.length})`}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disparando || lembretesHoje.length === 0}
                      onClick={dispararAutomaticoLembretes}
                      className="text-[11px] h-7 px-2.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold"
                      title="Disparar todos os lembretes de horário de hoje de forma automática"
                    >
                      <Clock3 size={12} className="mr-1.5" />
                      Disparar Hoje de Forma Automática
                    </Button>
                  }
                >
                  {lembretesHoje.length === 0 ? (
                    <p className="text-sm text-foreground/50 py-4 text-center">
                      Nenhum agendamento confirmado para o dia de hoje.
                    </p>
                  ) : (
                    <ul className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                      {lembretesHoje.map((item, idx) => (
                        <LinhaClienteMensagem
                          key={item.id || idx}
                          item={item}
                          onEnviarManual={handleEnviarManual}
                          onAdicionarTelefone={(it) => {
                            setClienteEditandoTelefone({
                              clienteId: it.cliente_id,
                              nome: it.nome || 'Cliente',
                            });
                            setNovoTelefone('');
                          }}
                        />
                      ))}
                    </ul>
                  )}
                </Panel>

                {/* CARD 2: CONFIRMAÇÕES DE VÉSPERA (AMANHÃ - ORDEM DE AGENDAMENTO) */}
                <Panel
                  title={`📅 Confirmações de Véspera - Amanhã (${confirmacoesVespera.length})`}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disparando || confirmacoesVespera.length === 0}
                      onClick={dispararAutomaticoConfirmacoes}
                      className="text-[11px] h-7 px-2.5 border-gold/40 text-gold hover:bg-gold/10 font-bold"
                      title="Disparar confirmações dos agendamentos de amanhã de forma automática"
                    >
                      <CalendarCheck size={12} className="mr-1.5" />
                      Disparar Confirmações Automaticamente
                    </Button>
                  }
                >
                  {confirmacoesVespera.length === 0 ? (
                    <p className="text-sm text-foreground/50 py-4 text-center">
                      Nenhum agendamento pendente de confirmação para amanhã.
                    </p>
                  ) : (
                    <ul className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                      {confirmacoesVespera.map((item, idx) => (
                        <LinhaClienteMensagem
                          key={item.id || idx}
                          item={item}
                          onEnviarManual={handleEnviarManual}
                          onAdicionarTelefone={(it) => {
                            setClienteEditandoTelefone({
                              clienteId: it.cliente_id,
                              nome: it.nome || 'Cliente',
                            });
                            setNovoTelefone('');
                          }}
                        />
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              {/* CARD 3: ANIVERSARIANTES DE HOJE */}
              <Panel
                title={`🎂 Aniversariantes de Hoje (${aniversariantesHoje.length})`}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disparando || aniversariantesHoje.length === 0}
                    onClick={dispararAutomaticoAniversarios}
                    className="text-[11px] h-7 px-2.5 border-purple-500/40 text-purple-400 hover:bg-purple-500/10 font-bold"
                    title="Disparar mensagens de feliz aniversário para todos os aniversariantes de hoje"
                  >
                    <Cake size={12} className="mr-1.5" />
                    Disparar Felicitações Automaticamente
                  </Button>
                }
              >
                {aniversariantesHoje.length === 0 ? (
                  <p className="text-sm text-foreground/50 py-4 text-center">
                    Nenhum cliente aniversariando no dia de hoje. 🎉
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                    {aniversariantesHoje.map((item, idx) => (
                      <LinhaClienteMensagem
                        key={item.id || idx}
                        item={item}
                        onEnviarManual={handleEnviarManual}
                        onAdicionarTelefone={(it) => {
                          setClienteEditandoTelefone({
                            clienteId: it.cliente_id || it.id,
                            nome: it.nome || 'Cliente',
                          });
                          setNovoTelefone('');
                        }}
                      />
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SUB-ABA 2: FEEDBACKS PÓS-ATENDIMENTO */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'feedbacks' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Star size={16} className="text-amber-400" /> Gestão de Feedbacks Pós-Atendimento
                  </h3>
                  <p className="text-xs text-foreground/55 mt-0.5">
                    Clientes com atendimentos recentes concluídos para envio da pesquisa de satisfação.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalFeedbackAberto(true)}
                    className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Sliders size={13} className="mr-1.5" />
                    Regras por Serviço
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={disparando || feedbacksRecentes.length === 0}
                    onClick={dispararAutomaticoFeedbacks}
                    className="text-xs font-bold"
                  >
                    <Send size={13} className="mr-1.5" />
                    Disparar Feedbacks Automaticamente
                  </Button>
                </div>
              </div>

              <Panel title={`⭐ Clientes Elegíveis para Feedback (${feedbacksRecentes.length})`}>
                {feedbacksRecentes.length === 0 ? (
                  <p className="text-sm text-foreground/50 py-6 text-center">
                    Nenhum cliente elegível para feedback no momento.
                  </p>
                ) : (
                  <ul className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    {feedbacksRecentes.map((item, idx) => (
                      <LinhaClienteMensagem
                        key={item.id || idx}
                        item={item}
                        isFeedback
                        onEnviarManual={handleEnviarManual}
                        onAdicionarTelefone={(it) => {
                          setClienteEditandoTelefone({
                            clienteId: it.cliente_id || it.id,
                            nome: it.nome || 'Cliente',
                          });
                          setNovoTelefone('');
                        }}
                      />
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SUB-ABA 3: RECUPERAÇÃO & RETENÇÃO DE CLIENTES */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'recuperacao' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)]">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <RotateCcw size={16} className="text-gold" /> Reengajamento e Retenção
                </h3>
                <p className="text-xs text-foreground/55 mt-0.5">
                  Reconecte-se com clientes que não frequentam o Studio há muito tempo para trazê-las de volta.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CARD 1: REENGAJAMENTO 90+ DIAS */}
                <Panel 
                  title={`🔄 Reengajamento 90+ dias (${reativacao?.total ?? 0})`}
                  action={reativacao?.error ? <span className="text-xs text-danger">{reativacao.error}</span> : undefined}
                >
                  {(reativacao?.itens?.length ?? 0) === 0 ? (
                    <p className="text-sm text-foreground/50 py-4 text-center">
                      Nenhuma cliente para reengajar no momento.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                      {reativacao!.itens!.map((i, idx) => (
                        <li key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{i.nome || 'Sem nome'}</p>
                            <p className="text-xs text-foreground/50 truncate">
                              {i.diasDesdeUltima === null ? 'Nunca frequentou' : `Última visita há ${i.diasDesdeUltima} dias`}
                              {' · '}
                              {i.telefone || <span className="text-amber-400 font-semibold">sem telefone</span>}
                            </p>
                          </div>
                          {i.ja_enviado_hoje || i.enviada_via_api ? (
                            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30 whitespace-nowrap">
                              ENVIADA HOJE
                            </span>
                          ) : i.wa_link ? (
                            <button
                              type="button"
                              onClick={() => handleEnviarManual(i)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors cursor-pointer"
                            >
                              <MessageCircleHeart size={13} /> Chamar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setClienteEditandoTelefone({
                                  clienteId: i.cliente_id || i.id,
                                  nome: i.nome || 'Cliente',
                                });
                                setNovoTelefone('');
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                            >
                              <Plus size={11} /> Adicionar Telefone
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                {/* CARD 2: INATIVAS HÁ 60+ DIAS */}
                <Panel title={`💤 Inativas há ${DIAS_INATIVO}+ dias (${inativos.length})`}>
                  {inativos.length === 0 ? (
                    <p className="text-sm text-foreground/50 py-4 text-center">Nenhuma cliente inativa no momento. 🎉</p>
                  ) : (
                    <ul className="space-y-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                      {inativos.map(c => (
                        <li key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]">
                          <Clock3 size={16} className="text-foreground/40 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{c.nome || 'Sem nome'}</p>
                            <p className="text-xs text-foreground/50">
                              {c.diasDesdeUltima === null ? 'Nunca frequentou' : `Última visita há ${c.diasDesdeUltima} dias`}
                              {' · '}
                              {c.telefone || <span className="text-amber-400 font-semibold">sem telefone</span>}
                            </p>
                          </div>
                          {c.telefone ? (
                            <BotaoReativar id={c.id} nome={c.nome} telefone={c.telefone} dias={c.diasDesdeUltima} />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setClienteEditandoTelefone({
                                  clienteId: c.id,
                                  nome: c.nome || 'Cliente',
                                });
                                setNovoTelefone('');
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                            >
                              <Plus size={11} /> Adicionar Telefone
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SUB-ABA 4: REGRAS E MENSAGENS PERSONALIZADAS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'regras' && (
            <div className="space-y-6">
              <RegrasMarketing isReadOnly={isReadOnly} />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SUB-ABA 5: HORÁRIOS & CONFIGURAÇÃO DE AUTOMAÇÃO */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'automacao' && (
            <div className="space-y-6">
              <ConfiguracaoAutomacao isReadOnly={isReadOnly} onConfigSaved={carregarTudo} />
            </div>
          )}
        </div>
      )}

      {/* MODAL RÁPIDO PARA CADASTRAR TELEFONE DA CLIENTE */}
      {clienteEditandoTelefone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-md p-6 animate-in fade-in zoom-in-95 border border-amber-500/30 shadow-2xl">
            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Phone size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Cadastrar Telefone</h3>
                  <p className="text-xs text-foreground/60">{clienteEditandoTelefone.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClienteEditandoTelefone(null)}
                className="text-foreground/40 hover:text-foreground p-1 rounded-lg hover:bg-foreground/5"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarTelefoneCliente} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Adicione o número com DDD para que o sistema possa gerar o link do WhatsApp e permitir disparos automáticos para esta cliente.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground/80 block mb-1.5">
                  Número de WhatsApp / Celular
                </label>
                <input
                  type="text"
                  placeholder="(42) 99999-9999 ou 5542999999999"
                  value={novoTelefone}
                  onChange={e => setNovoTelefone(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold font-mono"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setClienteEditandoTelefone(null)}
                  disabled={salvandoTelefone}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="font-bold"
                  disabled={salvandoTelefone || !novoTelefone.trim()}
                >
                  {salvandoTelefone ? 'Salvando...' : 'Salvar Telefone'}
                </Button>
              </div>
            </form>
          </CardGlass>
        </div>
      )}

      {/* MODAL DE SERVIÇOS DE FEEDBACK */}
      <ModalServicosFeedback
        isOpen={modalFeedbackAberto}
        onClose={() => setModalFeedbackAberto(false)}
        onConfirmar={async () => {
          setModalFeedbackAberto(false);
          await carregarTudo();
        }}
      />
    </div>
  );
}

// ─── Componente para Linha de Cliente na Fila de Mensagens ────────────────────

function LinhaClienteMensagem({
  item,
  isFeedback,
  onEnviarManual,
  onAdicionarTelefone,
}: {
  item: ItemMsg;
  isFeedback?: boolean;
  onEnviarManual: (i: ItemMsg) => void;
  onAdicionarTelefone: (i: ItemMsg) => void;
}) {
  const temTelefone = Boolean(item.telefone && item.telefone.length >= 8);

  return (
    <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] hover:border-gold/30 transition-all">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Horário de agendamento em destaque para ordenar visualmente */}
        {item.hora ? (
          <div className="flex flex-col items-center justify-center px-2 py-1.5 rounded-lg bg-gold/10 border border-gold/25 text-gold shrink-0">
            <Clock3 size={13} />
            <span className="font-mono text-xs font-bold mt-0.5">{item.hora}</span>
          </div>
        ) : isFeedback ? (
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <Star size={16} />
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-foreground/5 border border-[var(--border-subtle)] text-foreground/40 shrink-0">
            <User2 size={16} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground truncate">{item.nome || 'Cliente sem nome'}</p>
          </div>
          <p className="text-xs text-foreground/50 truncate mt-0.5">
            {item.servico && <span className="font-medium text-foreground/75">{item.servico} · </span>}
            {item.profissional && <span>{item.profissional} · </span>}
            {temTelefone ? (
              <span className="font-mono text-foreground/60">{item.telefone}</span>
            ) : (
              <span className="text-amber-400 font-semibold italic">Sem telefone</span>
            )}
          </p>
        </div>
      </div>

      {/* Ações e status do disparo */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {item.ja_enviado_hoje || item.enviada_via_api ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 whitespace-nowrap">
            <CheckCircle2 size={12} /> ENVIADA HOJE
          </span>
        ) : !temTelefone ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap">
              <AlertTriangle size={11} /> Sem Telefone
            </span>
            <button
              type="button"
              onClick={() => onAdicionarTelefone(item)}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
              title="Cadastrar telefone da cliente para liberar disparo"
            >
              <Plus size={12} /> Cadastrar
            </button>
          </div>
        ) : item.wa_link ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap">
              AGUARDANDO
            </span>
            <button
              type="button"
              onClick={() => onEnviarManual(item)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 transition-colors cursor-pointer"
              title="Abrir WhatsApp Web para enviar agora"
            >
              <ExternalLink size={12} /> Enviar
            </button>
          </div>
        ) : (
          <span className="text-xs text-foreground/40">—</span>
        )}
      </div>
    </li>
  );
}

// ─── Botão de Reativar ────────────────────────────────────────────────────────

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
