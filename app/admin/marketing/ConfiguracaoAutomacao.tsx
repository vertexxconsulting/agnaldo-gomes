'use client';

import { useState, useEffect } from 'react';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import {
  Clock, ShieldCheck, CheckCircle2, AlertTriangle,
  Cake, CalendarCheck, Star, HeartHandshake, BellRing, Save, RefreshCw, SlidersHorizontal, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { MarketingAutomacaoConfig, CONFIG_PADRAO_MARKETING } from '@/lib/marketing-types';
import { ModalServicosFeedback } from './ModalServicosFeedback';

export function ConfiguracaoAutomacao({ onConfigSaved }: { onConfigSaved?: () => void }) {
  const [config, setConfig] = useState<MarketingAutomacaoConfig>(CONFIG_PADRAO_MARKETING);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modalFeedbackAberto, setModalFeedbackAberto] = useState(false);
  const [disparandoLembrete, setDisparandoLembrete] = useState(false);

  const handleDispararLembreteHoje = async () => {
    if (!confirm('Deseja iniciar agora o disparo manual dos lembretes de horário para os agendamentos de HOJE?\n\n• As mensagens serão disparadas imediatamente, mesmo que antes do horário padrão configurado.\n• Clientes que já receberam mensagem hoje não receberão novamente (proteção anti-duplicação).\n• Intervalo seguro anti-ban de 1 min entre cada envio.')) {
      return;
    }
    setDisparandoLembrete(true);
    toast.info('Iniciando disparos de lembretes do dia...');
    try {
      const res = await fetch('/api/cron/agenda?execute=true&force=true&tipo=lembrete_hoje');
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.enviados_automaticos > 0) {
          toast.success(`${data.enviados_automaticos} lembrete(s) de hoje enviado(s) com sucesso!`);
        } else if ((data.itens?.length ?? 0) === 0) {
          toast.info('Nenhum agendamento ativo encontrado para o dia de hoje.');
        } else {
          toast.info('Todos os lembretes do dia já haviam sido enviados anteriormente (anti-duplicação).');
        }
        if (onConfigSaved) onConfigSaved();
      } else {
        toast.error(data.error || 'Erro ao processar disparos de lembrete.');
      }
    } catch (err: any) {
      toast.error(`Falha na requisição: ${err.message}`);
    } finally {
      setDisparandoLembrete(false);
    }
  };

  useEffect(() => {
    carregarConfig();
  }, []);

  const carregarConfig = async () => {
    setCarregando(true);
    try {
      const res = await fetch('/api/admin/marketing/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (e: any) {
      console.error('Erro ao carregar configurações de marketing:', e);
    } finally {
      setCarregando(false);
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const res = await fetch('/api/admin/marketing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        toast.success('Horários e travas de disparo salvos com sucesso!');
        onConfigSaved?.();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao salvar configurações.');
      }
    } catch (e: any) {
      toast.error(`Falha ao salvar: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarFiltroFeedback = async (dados: {
    tipo_filtro: 'todos' | 'selecionados';
    servicos_permitidos: string[];
    categorias_permitidas: string[];
  }) => {
    const novaConfig: MarketingAutomacaoConfig = {
      ...config,
      feedback: {
        ...config.feedback,
        tipo_filtro: dados.tipo_filtro,
        servicos_permitidos: dados.servicos_permitidos,
        categorias_permitidas: dados.categorias_permitidas,
      },
    };
    setConfig(novaConfig);

    setSalvando(true);
    try {
      const res = await fetch('/api/admin/marketing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaConfig),
      });

      if (res.ok) {
        toast.success('Tipos de serviço para feedback atualizados com sucesso!');
        onConfigSaved?.();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao salvar configurações.');
      }
    } catch (e: any) {
      toast.error(`Falha ao salvar: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const atualizarSessao = (
    sessao: keyof Omit<MarketingAutomacaoConfig, 'intervalo_segundos'>,
    campo: 'ativo' | 'horario',
    valor: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [sessao]: {
        ...prev[sessao],
        [campo]: valor,
      },
    }));
  };

  const sessoes = [
    {
      key: 'aniversarios' as const,
      titulo: 'Aniversariantes do Dia',
      desc: 'Dispara felicitações no dia do aniversário do cliente',
      icone: <Cake size={20} className="text-pink-400" />,
      padraoHora: '09:00',
    },
    {
      key: 'agenda_confirmacao' as const,
      titulo: 'Confirmação de Agenda (Véspera)',
      desc: 'Envia lembrete 1 dia antes para o cliente confirmar presença',
      icone: <CalendarCheck size={20} className="text-gold" />,
      padraoHora: '09:30',
    },
    {
      key: 'agenda_lembrete' as const,
      titulo: 'Lembrete de Horário (No Dia)',
      desc: 'Alerta poucas horas antes no próprio dia do atendimento',
      icone: <Clock size={20} className="text-amber-400" />,
      padraoHora: '08:30',
    },
    {
      key: 'feedback' as const,
      titulo: 'Feedback Pós-Atendimento',
      desc: 'Solicita avaliação (nota 0 a 10) 1 dia após procedimento concluído',
      icone: <Star size={20} className="text-emerald-400" />,
      padraoHora: '16:00',
    },
    {
      key: 'reativacao' as const,
      titulo: 'Reativação de Clientes Sumidas',
      desc: 'Reengaja clientes que não frequentam o Studio há 90+ dias',
      icone: <HeartHandshake size={20} className="text-purple-400" />,
      padraoHora: '11:00',
    },
  ];

  return (
    <CardGlass className="p-6 border-l-4 border-l-gold shadow-lg space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <BellRing size={20} className="text-gold" />
            Trava de Disparos & Horários por Sessão
          </h3>
          <p className="text-xs text-foreground/60 mt-1">
            Defina quais sessões estão autorizadas a disparar automaticamente e o horário exato de cada uma.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarConfig}
            disabled={carregando}
            className="text-xs"
          >
            <RefreshCw size={13} className={`mr-1.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={salvar}
            disabled={salvando}
            className="text-xs font-bold shadow-md shadow-gold/10"
          >
            <Save size={14} className="mr-1.5" />
            {salvando ? 'Salvando...' : 'Salvar Regras'}
          </Button>
        </div>
      </div>

      {/* GRADE DAS SESSÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessoes.map(s => {
          const itemConfig = config[s.key];
          const isAtivo = Boolean(itemConfig?.ativo);

          return (
            <div
              key={s.key}
              className={`p-4 rounded-xl border transition-all ${
                isAtivo
                  ? 'border-gold/40 bg-gold/[0.03] shadow-sm'
                  : 'border-[var(--border-subtle)] bg-foreground/[0.01] opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-foreground/5 border border-foreground/10">
                    {s.icone}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground leading-snug">{s.titulo}</h4>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      isAtivo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-foreground/10 text-foreground/50'
                    }`}>
                      {isAtivo ? 'Ativo' : 'Desativado'}
                    </span>
                  </div>
                </div>

                {/* Switch Ativar/Desativar */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAtivo}
                    onChange={e => atualizarSessao(s.key, 'ativo', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold"></div>
                </label>
              </div>

              <p className="text-xs text-foreground/60 mb-3 min-h-[32px]">
                {s.desc}
              </p>

              {/* Seletor de Horário */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-xs font-medium text-foreground/70 flex items-center gap-1">
                  <Clock size={13} className="text-foreground/40" /> Horário de Disparo:
                </span>
                <input
                  type="time"
                  value={itemConfig?.horario || s.padraoHora}
                  disabled={!isAtivo}
                  onChange={e => atualizarSessao(s.key, 'horario', e.target.value)}
                  className={`bg-background border rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:border-gold ${
                    isAtivo
                      ? 'border-[var(--border-subtle)] text-foreground'
                      : 'border-transparent text-foreground/30 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Botão de Disparo Imediato para Lembrete de Horário do Dia */}
              {s.key === 'agenda_lembrete' && (
                <div className="pt-2 mt-2 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    disabled={disparandoLembrete}
                    onClick={handleDispararLembreteHoje}
                    className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/20 text-amber-400 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    title="Dispara agora os lembretes de horário do dia via WhatsApp sem esperar o horário padrão"
                  >
                    <Send size={13} className={disparandoLembrete ? 'animate-pulse' : ''} />
                    <span>{disparandoLembrete ? 'Disparando Lembretes...' : 'Disparar Lembretes de Hoje Agora'}</span>
                  </button>
                </div>
              )}

              {/* Botão de Filtro de Tipos de Serviço exclusivo para Feedback */}
              {s.key === 'feedback' && (
                <div className="pt-2 mt-2 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setModalFeedbackAberto(true)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-foreground/[0.03] border border-gold/30 hover:border-gold hover:bg-gold/[0.06] transition-all text-left"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <SlidersHorizontal size={13} className="text-gold shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        Tipos de Serviço
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-gold shrink-0">
                      {config.feedback.tipo_filtro === 'selecionados'
                        ? `${config.feedback.servicos_permitidos?.length || 0} selecionado(s)`
                        : 'Todos os serviços'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BLOCO DE SEGURANÇA E INTERVALO ANTI-BLOQUEIO */}
      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Trava de Segurança & Proteção WhatsApp (Anti-Ban)
            </h4>
            <p className="text-xs text-foreground/70 mt-0.5">
              O sistema possui pausa obrigatória entre cada mensagem consecutiva e proteção contra duplicação no mesmo dia.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <span className="text-xs font-semibold text-foreground/80 whitespace-nowrap">
            Intervalo entre envios:
          </span>
          <select
            value={config.intervalo_segundos}
            onChange={e => setConfig(prev => ({ ...prev, intervalo_segundos: Number(e.target.value) }))}
            className="bg-background border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-foreground font-bold focus:outline-none focus:border-gold"
          >
            <option value={60}>1 Minuto (60s) - Recomendado</option>
            <option value={90}>1 Minuto e Meio (90s)</option>
            <option value={120}>2 Minutos (120s)</option>
            <option value={180}>3 Minutos (180s)</option>
          </select>
        </div>
      </div>

      {/* MODAL DE SELEÇÃO DE SERVIÇOS PARA FEEDBACK */}
      <ModalServicosFeedback
        isOpen={modalFeedbackAberto}
        onClose={() => setModalFeedbackAberto(false)}
        tipoFiltro={config.feedback.tipo_filtro || 'todos'}
        servicosSelecionados={config.feedback.servicos_permitidos || []}
        categoriasSelecionadas={config.feedback.categorias_permitidas || []}
        onConfirmar={handleConfirmarFiltroFeedback}
      />
    </CardGlass>
  );
}
