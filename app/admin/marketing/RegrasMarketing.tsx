'use client';

import { useState, useEffect, useCallback } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/Button';
import {
  Plus, Trash2, X, Settings2, Pencil, CalendarCheck, Clock, Star,
  Cake, HeartHandshake, RotateCcw, Lock, Users, BellRing, Save,
  RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  fetchMarketingRules, createMarketingRule, updateMarketingRule, deleteMarketingRule,
  fetchServicos, fetchSystemSettings, updateSystemSetting,
} from '@/lib/supabase-queries';
import { Servico } from '@/lib/gestao-types';
import { MENSAGENS_PADRAO, aplicarTemplate, invalidarCacheMensagens, type ChaveMensagem } from '@/lib/mensagens';
import { toast } from 'sonner';

/** Mensagens padrão do sistema (disparadas pelos crons) */
const PADROES: {
  chave: ChaveMensagem;
  titulo: string;
  quando: string;
  icone: typeof CalendarCheck;
  variaveis: string[];
}[] = [
  { chave: 'msg_confirmacao', titulo: 'Confirmação de Agendamento', quando: '1 dia antes do horário', icone: CalendarCheck, variaveis: ['nome', 'servico', 'profissional', 'data', 'hora'] },
  { chave: 'msg_lembrete', titulo: 'Lembrete do Dia', quando: 'No dia do atendimento', icone: Clock, variaveis: ['nome', 'servico', 'hora'] },
  { chave: 'msg_feedback', titulo: 'Feedback Pós-Atendimento', quando: '1 dia após o serviço concluído', icone: Star, variaveis: ['nome', 'servico'] },
  { chave: 'msg_aniversario', titulo: 'Feliz Aniversário', quando: 'No dia do aniversário, às 08h', icone: Cake, variaveis: ['nome'] },
  { chave: 'msg_reativacao', titulo: 'Reativação de Cliente', quando: 'Cliente sem visita há muito tempo', icone: HeartHandshake, variaveis: ['nome', 'tempo'] },
];

const EXEMPLO: Record<string, string> = {
  nome: 'Maria', servico: 'Mechas', profissional: 'Agnaldo', data: '15/10', hora: '14:30', tempo: '3 meses',
};

const inputCls = 'w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]';

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Variaveis({ lista, onInserir }: { lista: string[]; onInserir?: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {lista.map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onInserir?.(v)}
          className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 transition-colors"
          title="Clique para inserir"
        >
          {`{${v}}`}
        </button>
      ))}
    </div>
  );
}

function Preview({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl bg-[#0b141a] p-3">
      <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 text-[13px] text-white whitespace-pre-wrap leading-relaxed">
        {aplicarTemplate(texto || '', EXEMPLO) || <span className="opacity-50">Mensagem vazia</span>}
      </div>
    </div>
  );
}

// ─── Card de trava + destinatários para uma regra personalizada ───────────────

interface RegraPreview {
  regra_id: string;
  regra_nome: string;
  trigger_timing: string;
  days_offset: number;
  send_method: string;
  ativo: boolean;
  horario: string;
  itens: {
    chaveUnica?: string;
    nome: string | null;
    telefone: string;
    mensagem: string;
    wa_link: string;
    ja_enviado_hoje: boolean;
    data_referencia: string;
    servico_nome: string | null;
  }[];
}

function CardRegraControle({ regra }: { regra: any }) {
  const [ativo, setAtivo] = useState(false);
  const [horario, setHorario] = useState('10:00');
  const [salvando, setSalvando] = useState(false);
  const [preview, setPreview] = useState<RegraPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [expandido, setExpandido] = useState(false);

  // Carrega config de trava + preview de destinatários
  const carregarDados = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const [cfgRes, prevRes] = await Promise.all([
        fetch(`/api/admin/marketing/rule-config?ruleId=${regra.id}`),
        fetch(`/api/cron/marketing-rules?preview=true&ruleId=${regra.id}`),
      ]);
      if (cfgRes.ok) {
        const d = await cfgRes.json();
        setAtivo(Boolean(d.config?.ativo));
        setHorario(d.config?.horario || '10:00');
      }
      if (prevRes.ok) {
        const d = await prevRes.json();
        const grupo = (d.itens_por_regra ?? [])[0] ?? null;
        setPreview(grupo);
      }
    } finally {
      setLoadingPreview(false);
    }
  }, [regra.id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const salvar = async () => {
    setSalvando(true);
    try {
      const res = await fetch('/api/admin/marketing/rule-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId: regra.id, ativo, horario }),
      });
      if (res.ok) {
        toast.success(`Trava de "${regra.name}" salva!`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao salvar.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const totalDestinatarios = preview?.itens?.length ?? 0;
  const pendentes = preview?.itens?.filter(i => !i.ja_enviado_hoje) ?? [];

  return (
    <div
      className={`rounded-xl border transition-all ${
        ativo
          ? 'border-gold/40 bg-gold/[0.03] shadow-sm'
          : 'border-[var(--border-subtle)] bg-foreground/[0.01] opacity-80'
      }`}
    >
      {/* Cabeçalho da trava */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-foreground/5 border border-foreground/10">
            <Settings2 size={18} className="text-[var(--accent)]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground leading-snug truncate max-w-[180px]">
              {regra.name}
            </h4>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                ativo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-foreground/10 text-foreground/50'
              }`}
            >
              {ativo ? 'Ativo' : 'Desativado'}
            </span>
          </div>
        </div>

        {/* Toggle ativo */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={ativo}
            onChange={e => setAtivo(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold" />
        </label>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Seletor de horário */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-xs font-medium text-foreground/70 flex items-center gap-1">
            <Clock size={13} className="text-foreground/40" /> Horário de Disparo:
          </span>
          <input
            type="time"
            value={horario}
            disabled={!ativo}
            onChange={e => setHorario(e.target.value)}
            className={`bg-background border rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:border-gold ${
              ativo
                ? 'border-[var(--border-subtle)] text-foreground'
                : 'border-transparent text-foreground/30 cursor-not-allowed'
            }`}
          />
        </div>

        {/* Botão salvar */}
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gold/10 border border-gold/30 hover:bg-gold/20 hover:border-gold/50 text-gold font-bold text-xs transition-all disabled:opacity-50"
        >
          <Save size={12} />
          {salvando ? 'Salvando...' : 'Salvar Trava'}
        </button>

        {/* Destinatários de hoje */}
        <div className="pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setExpandido(v => !v)}
            className="w-full flex items-center justify-between text-xs text-foreground/70 hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <Users size={13} />
              {loadingPreview
                ? 'Calculando destinatárias...'
                : `${pendentes.length} para receber hoje`}
              {totalDestinatarios > 0 && !loadingPreview && (
                <span className="text-[10px] text-foreground/50">({totalDestinatarios} total)</span>
              )}
            </span>
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expandido && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {loadingPreview ? (
                <p className="text-xs text-foreground/40 py-2 text-center">Carregando...</p>
              ) : pendentes.length === 0 ? (
                <p className="text-xs text-foreground/40 py-2 text-center">
                  Nenhuma cliente para hoje 🎉
                </p>
              ) : (
                pendentes.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border-subtle)]"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {item.nome || 'Sem nome'}
                      </p>
                      {item.servico_nome && (
                        <p className="text-[10px] text-foreground/50 truncate">{item.servico_nome}</p>
                      )}
                    </div>
                    {item.wa_link && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!item.wa_link) return;
                          window.open(item.wa_link, '_blank', 'noopener,noreferrer');
                          if (item.chaveUnica) {
                            try {
                              await fetch('/api/admin/marketing/registrar-disparo', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ chaveUnica: item.chaveUnica }),
                              });
                              setPreview(prev => prev ? {
                                ...prev,
                                itens: prev.itens.map(it => it.chaveUnica === item.chaveUnica ? { ...it, ja_enviado_hoje: true } : it)
                              } : prev);
                              toast.success(`Mensagem para ${item.nome || 'cliente'} registrada como enviada!`);
                            } catch (e) {
                              console.error(e);
                            }
                          }
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Chamar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function RegrasMarketing() {
  const [regras, setRegras] = useState<any[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Modal de mensagem padrão
  const [editPadrao, setEditPadrao] = useState<ChaveMensagem | null>(null);
  const [textoPadrao, setTextoPadrao] = useState('');
  const [salvandoPadrao, setSalvandoPadrao] = useState(false);

  // Modal de regra personalizada
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [dias, setDias] = useState(1);
  const [timing, setTiming] = useState('AFTER');
  const [sendMethod, setSendMethod] = useState('AUTO');
  const [mensagem, setMensagem] = useState('');
  const [salvandoRegra, setSalvandoRegra] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const [rules, srvs, settings] = await Promise.all([
      fetchMarketingRules(),
      fetchServicos(),
      fetchSystemSettings(),
    ]);
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    setRegras(rules);
    setServicos(srvs);
    setTemplates(map);
    setLoading(false);
  };

  const textoAtual = (chave: ChaveMensagem) => templates[chave]?.trim() || MENSAGENS_PADRAO[chave];
  const personalizada = (chave: ChaveMensagem) =>
    !!templates[chave]?.trim() && templates[chave].trim() !== MENSAGENS_PADRAO[chave];

  // ── Mensagens padrão ─────────────────────────────────────────────────────────
  const abrirPadrao = (chave: ChaveMensagem) => {
    setEditPadrao(chave);
    setTextoPadrao(textoAtual(chave));
  };

  const salvarPadrao = async () => {
    if (!editPadrao) return;
    if (!textoPadrao.trim()) {
      alert('A mensagem não pode ficar vazia.');
      return;
    }
    setSalvandoPadrao(true);
    const res = await updateSystemSetting(editPadrao, textoPadrao.trim());
    setSalvandoPadrao(false);
    if (!res.ok) {
      alert(res.error || 'Erro ao salvar mensagem');
      return;
    }
    invalidarCacheMensagens();
    setTemplates(t => ({ ...t, [editPadrao]: textoPadrao.trim() }));
    setEditPadrao(null);
  };

  // ── Regras personalizadas ─────────────────────────────────────────────────────
  const abrirNovaRegra = () => {
    setEditId(null);
    setNome('');
    setServiceId('');
    setDias(1);
    setTiming('AFTER');
    setSendMethod('AUTO');
    setMensagem('');
    setIsModalOpen(true);
  };

  const abrirEditarRegra = (r: any) => {
    setEditId(r.id);
    setNome(r.name ?? '');
    setServiceId(r.service_id ?? '');
    setDias(r.days_offset ?? 1);
    setTiming(r.trigger_timing ?? 'AFTER');
    setSendMethod(r.send_method ?? 'AUTO');
    setMensagem(r.message_template ?? '');
    setIsModalOpen(true);
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      alert('Informe o nome da operação');
      return;
    }
    if (!mensagem.trim()) {
      alert('Escreva a mensagem que será enviada');
      return;
    }
    const payload = {
      name: nome.trim(),
      service_id: serviceId || null,
      days_offset: dias,
      trigger_timing: timing,
      send_method: sendMethod,
      message_template: mensagem.trim(),
    };
    setSalvandoRegra(true);
    const res = editId ? await updateMarketingRule(editId, payload) : await createMarketingRule(payload);
    setSalvandoRegra(false);
    if (res.ok) {
      setIsModalOpen(false);
      carregarDados();
    } else {
      alert(res.error || 'Erro ao salvar regra');
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja excluir esta regra?')) return;
    const res = await deleteMarketingRule(id);
    if (res.ok) carregarDados();
    else alert(res.error || 'Erro ao excluir');
  };

  const padraoAtivo = PADROES.find(p => p.chave === editPadrao);

  return (
    <>
      {/* ── MENSAGENS PADRÃO ── */}
      <Panel title="Mensagens Automáticas Padrão">
        {loading ? (
          <p className="text-sm text-foreground/50 py-3">Carregando mensagens...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {PADROES.map(p => {
              const Icone = p.icone;
              return (
                <div
                  key={p.chave}
                  className="group flex flex-col gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] hover:border-[var(--accent)]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                        <Icone size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-tight">{p.titulo}</p>
                        <p className="text-[11px] text-foreground/55 mt-0.5">{p.quando}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => abrirPadrao(p.chave)}
                      className="p-1.5 rounded-lg text-foreground/50 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                      title="Editar mensagem"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-foreground/70 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                    {textoAtual(p.chave)}
                  </p>
                  <div className="mt-auto flex items-center gap-2 text-[10px] font-semibold">
                    <span className="px-2 py-1 rounded-md bg-foreground/5 text-foreground/60 border border-[var(--border-subtle)] inline-flex items-center gap-1">
                      <Lock size={10} /> Sistema
                    </span>
                    {personalizada(p.chave) && (
                      <span className="px-2 py-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                        Personalizada
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── REGRAS PERSONALIZADAS ── */}
      <Panel
        title="Regras Personalizadas"
        action={
          <Button variant="outline" size="sm" onClick={abrirNovaRegra}>
            <Plus size={14} className="mr-1" /> Nova Regra
          </Button>
        }
      >
        {loading ? (
          <p className="text-sm text-foreground/50 py-3">Carregando regras...</p>
        ) : regras.length === 0 ? (
          <button
            onClick={abrirNovaRegra}
            className="w-full flex flex-col items-center justify-center gap-2 min-h-[140px] p-4 rounded-xl border-2 border-dashed border-[var(--border-subtle)] text-foreground/50 hover:text-[var(--accent)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-colors"
          >
            <Plus size={22} />
            <span className="text-sm font-semibold">Nova mensagem / regra</span>
            <span className="text-[11px] text-center opacity-80">Ex: retoque de mechas após 90 dias</span>
          </button>
        ) : (
          <div className="space-y-6">
            {/* Grade de cards de regra + trava lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {regras.map(r => (
                <div
                  key={r.id}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {/* Card da regra (info + editar/excluir) */}
                  <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] hover:border-[var(--accent)]/40 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                          <Settings2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground leading-tight truncate">{r.name}</p>
                          <p className="text-[11px] text-foreground/55 mt-0.5">
                            {r.trigger_timing === 'BEFORE' ? 'Antes do agendamento' : 'Após o serviço'} · {r.days_offset} dia(s)
                            {' · '}
                            {r.service ? r.service.name : 'Qualquer serviço'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0">
                        <button
                          onClick={() => abrirEditarRegra(r)}
                          className="p-1.5 rounded-lg text-foreground/50 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                          title="Editar regra"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleExcluir(r.id)}
                          className="p-1.5 rounded-lg text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Excluir regra"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/70 whitespace-pre-wrap line-clamp-4 leading-relaxed flex-1">
                      {r.message_template || <span className="italic opacity-60">Sem mensagem definida</span>}
                    </p>
                    <div className="mt-auto text-[10px] font-semibold">
                      <span className={`px-2 py-1 rounded-md ${r.send_method === 'AUTO' ? 'bg-success/10 text-success border border-success/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                        {r.send_method === 'AUTO' ? 'Automático (Evolution API)' : 'Manual (Link WhatsApp)'}
                      </span>
                    </div>
                  </div>

                  {/* Card de trava + destinatários */}
                  <CardRegraControle regra={r} />
                </div>
              ))}
            </div>

            {/* Botão adicionar no final */}
            <button
              onClick={abrirNovaRegra}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[var(--border-subtle)] text-foreground/50 hover:text-[var(--accent)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-colors text-sm font-semibold"
            >
              <Plus size={18} /> Nova mensagem / regra
            </button>
          </div>
        )}
      </Panel>

      {/* ── MODAL: EDITAR MENSAGEM PADRÃO ── */}
      {editPadrao && padraoAtivo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--card)] sm:bg-[var(--background)] border border-[var(--border-subtle)] w-full max-w-lg rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditPadrao(null)}
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[var(--foreground)]">{padraoAtivo.titulo}</h2>
            <p className="text-xs text-[var(--muted-foreground)] mb-5">Enviada: {padraoAtivo.quando}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--muted-foreground)] mb-2">Variáveis disponíveis</label>
                <Variaveis lista={padraoAtivo.variaveis} onInserir={v => setTextoPadrao(t => `${t}{${v}}`)} />
              </div>
              <textarea
                rows={6}
                value={textoPadrao}
                onChange={e => setTextoPadrao(e.target.value)}
                className={`${inputCls} resize-none text-sm`}
              />
              <div>
                <label className="block text-sm text-[var(--muted-foreground)] mb-2">Pré-visualização</label>
                <Preview texto={textoPadrao} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <Button
                variant="ghost"
                onClick={() => setTextoPadrao(MENSAGENS_PADRAO[editPadrao])}
                title="Voltar ao texto original do sistema"
              >
                <RotateCcw size={14} className="mr-1" /> Restaurar padrão
              </Button>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setEditPadrao(null)}>Cancelar</Button>
                <Button variant="primary" onClick={salvarPadrao} disabled={salvandoPadrao}>
                  {salvandoPadrao ? 'Salvando...' : 'Salvar Mensagem'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVA / EDITAR REGRA ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--card)] sm:bg-[var(--background)] border border-[var(--border-subtle)] w-full max-w-lg rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-6">
              {editId ? 'Editar Regra de Mensagem' : 'Nova Regra de Mensagem'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--muted-foreground)] mb-1">Nome da Operação</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Retoque de Mechas 90d"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--muted-foreground)] mb-1">Tipo de Serviço</label>
                <select value={serviceId} onChange={e => setServiceId(e.target.value)} className={inputCls}>
                  <option value="">Todos os Serviços</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-[var(--muted-foreground)] mb-1">Dias</label>
                  <input
                    type="number"
                    min="0"
                    value={dias}
                    onChange={e => setDias(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-[var(--muted-foreground)] mb-1">Momento</label>
                  <select value={timing} onChange={e => setTiming(e.target.value)} className={inputCls}>
                    <option value="AFTER">Após o Serviço</option>
                    <option value="BEFORE">Antes do Agend.</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--muted-foreground)] mb-1">Forma de Disparo</label>
                <select value={sendMethod} onChange={e => setSendMethod(e.target.value)} className={inputCls}>
                  <option value="AUTO">Automático (Evolution API)</option>
                  <option value="MANUAL">Manual (Apenas Listar)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[var(--muted-foreground)] mb-2">Mensagem</label>
                <div className="mb-2">
                  <Variaveis
                    lista={['nome', 'servico', 'profissional', 'data', 'hora']}
                    onInserir={v => setMensagem(m => `${m}{${v}}`)}
                  />
                </div>
                <textarea
                  rows={5}
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  placeholder="Ex: Oi {nome}! Já faz um tempinho do seu {servico}, que tal agendar o retoque?"
                  className={`${inputCls} resize-none text-sm`}
                />
              </div>

              {mensagem.trim() && (
                <div>
                  <label className="block text-sm text-[var(--muted-foreground)] mb-2">Pré-visualização</label>
                  <Preview texto={mensagem} />
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSalvar} disabled={salvandoRegra}>
                {salvandoRegra ? 'Salvando...' : editId ? 'Salvar Alterações' : 'Salvar Regra'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
