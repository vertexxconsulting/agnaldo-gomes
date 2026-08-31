'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Crown, Heart, Camera, Star, Users, Plus, CalendarDays, Trash2,
  CheckCircle2, XCircle, CreditCard, Copy, Check, QrCode, AlertTriangle, Receipt,
} from 'lucide-react';
import {
  getNoivaPacotes, getNoivaAgendamentos, getNoivaPagamentos,
  criarAgendamentoNoiva, atualizarStatusNoiva, excluirAgendamentoNoiva,
  registrarPagamentoNoiva, gerarPixCopiaCola, totalPago, podeConfirmar,
  formatBRL, NOIVA_SINAL_MIN_PCT,
  NOIVA_STATUS_LABEL, NOIVA_STATUS_COLOR, subscribeNoivas,
  type AgendamentoNoiva, type StatusAgendamentoNoiva,
} from '@/lib/noivas';
import { isMPAtivo, criarPixMercadoPago } from '@/lib/pagamentos-studio';

const PENDING_AGENDAMENTOS_LS = 'ag_noivas_pending_list';

export default function NoivasPage() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoNoiva[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pagamentoAberto, setPagamentoAberto] = useState<string | null>(null);
  const [detalheAberto, setDetalheAberto] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const [dbServicos, setDbServicos] = useState<any[]>([]);

  useEffect(() => {
    const atualizar = () => setAgendamentos(getNoivaAgendamentos());
    atualizar();
    const unsub = subscribeNoivas(atualizar);
    
    // Buscar serviços reais para não quebrar a tela se a noiva for agendada pelo App
    fetch('/api/servicos')
      .then(res => res.json())
      .then(data => setDbServicos(Array.isArray(data) ? data : []))
      .catch(console.error);
      
    return () => unsub();
  }, []);

  const pacotesStatic = getNoivaPacotes();
  const profissionais = [
    { id: 'p1', nome: 'Agnaldo Gomes' },
    { id: 'p2', nome: 'Camila Ferreira' },
  ];

  const filtrados = filtroStatus === 'todos'
    ? agendamentos
    : agendamentos.filter(a => a.status === filtroStatus);

  const sorted = [...filtrados].sort((a, b) => a.data_agendamento.localeCompare(b.data_agendamento));

  // Combina os estáticos com os que vieram do banco
  const pacotes = [
    ...pacotesStatic,
    ...dbServicos.map(s => ({
      id: s.id,
      nome: s.name || s.nome || 'Serviço sem nome',
      descricao: s.description || s.descricao || '',
      preco: Number(s.price || s.preco || 0),
      duracao_min: Number(s.duration_minutes || s.duracao || 0),
      itens: [],
      ativo: true
    }))
  ];

  const pacoteById = (id: string) => pacotes.find(p => p.id === id) || {
    id,
    nome: 'Pacote Personalizado',
    descricao: 'Serviço importado do App',
    preco: 0,
    duracao_min: 0,
    itens: [],
    ativo: true
  };
  const profById = (id: string) => profissionais.find(p => p.id === id);

  const handleNovo = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    await criarAgendamentoNoiva({
      pacote_id: data.get('pacote_id') as string,
      nome_noiva: data.get('nome_noiva') as string,
      telefone: data.get('telefone') as string,
      email: (data.get('email') as string) || null,
      data_evento: data.get('data_evento') as string,
      data_agendamento: data.get('data_agendamento') as string,
      hora: data.get('hora') as string,
      profissional_id: data.get('profissional_id') as string,
      sinal_percentual: NOIVA_SINAL_MIN_PCT,
      observacoes: (data.get('observacoes') as string) || null,
    });
    setMostrarForm(false);
  };

  const copiarPix = (codigo: string) => {
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
            <span className="text-primary mr-2">♦</span>Dia da Noiva
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Agendamentos de noivas — sinal mínimo de {NOIVA_SINAL_MIN_PCT}% para confirmar e proteger a agenda.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm(v => !v)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Novo Agendamento de Noiva
        </button>
      </div>

      {/* Formulário de novo agendamento */}
      {mostrarForm && (
        <form onSubmit={e => { e.preventDefault(); handleNovo(e.currentTarget); }} className="mt-6 bg-card border border-[var(--border-subtle)] rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1.5">Pacote</label>
            <select name="pacote_id" required className="w-full bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {pacotes.map(p => (
                <option key={p.id} value={p.id}>{p.nome} — {formatBRL(p.preco)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Nome da Noiva</label>
            <input name="nome_noiva" required className="w-full bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Nome completo" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Telefone</label>
            <input name="telefone" required className="w-full bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="(42) 99999-9999" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">E-mail (opcional)</label>
            <input name="email" type="email" className="w-full bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Data do Casamento</label>
            <input name="data_evento" type="date" required className="w-full bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Data da Prova (Agendado pelo Salão)</label>
            <input name="data_agendamento" type="date" required className="w-full bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Horário</label>
            <input name="hora" type="time" required defaultValue="08:00" className="w-full bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5">Profissional</label>
            <select name="profissional_id" required className="w-full bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1.5">Observações</label>
            <textarea name="observacoes" rows={2} className="w-full bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Detalhes do visual, madrinhais, local do evento..." />
          </div>
          <div className="md:col-span-2 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setMostrarForm(false)} className="px-5 py-2.5 text-sm font-bold text-foreground/60 hover:text-foreground">Cancelar</button>
            <button type="submit" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
              <CalendarDays size={16} /> Reservar Agenda
            </button>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3">
              <AlertTriangle size={14} className="shrink-0" />
              A reserva fica com status <b>"Sinal Pendente"</b> até o pagamento de no mínimo {NOIVA_SINAL_MIN_PCT}% do valor. Sem o sinal, a data pode ser liberada para outros clientes.
            </div>
          </div>
        </form>
      )}

      {/* Filtro de status */}
      <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
        {['todos', 'sinal_pendente', 'sinal_pago', 'confirmado', 'concluido', 'cancelado'].map(s => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-colors ${
              filtroStatus === s
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card border-[var(--border-subtle)] text-foreground/60 hover:border-primary/50'
            }`}
          >
            {s === 'todos' ? 'Todos' : NOIVA_STATUS_LABEL[s as StatusAgendamentoNoiva]}
          </button>
        ))}
      </div>

      {/* Lista de agendamentos */}
      <div className="mt-6 flex flex-col gap-4">
        {sorted.length === 0 && (
          <div className="bg-card border border-[var(--border-subtle)] rounded-xl p-10 text-center text-sm text-foreground/50">
            Nenhum agendamento de noiva por aqui ainda. Clique em "Novo Agendamento de Noiva" para começar.
          </div>
        )}
        {sorted.map(ag => {
          const pacote = pacoteById(ag.pacote_id);
          const prof = profById(ag.profissional_id);
          const pagos = getNoivaPagamentos(ag.id);
          const pago = totalPago(ag.id);
          const podeConf = podeConfirmar(ag.id);
          const Icon = ag.pacote_id === 'noiva-vip' ? Crown : ag.pacote_id === 'noiva-dia-completo' ? Heart : ag.pacote_id === 'noiva-prova' ? Camera : ag.pacote_id === 'noiva-penteado' ? Star : Users;
          const aberto = detalheAberto === ag.id;
          return (
            <div key={ag.id} className="bg-card border border-[var(--border-subtle)] rounded-xl overflow-hidden">
              <div className="p-5 flex items-center gap-4 flex-wrap">
                <div className={`w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-48">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold">{ag.nome_noiva}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${NOIVA_STATUS_COLOR[ag.status]}`}>
                      {NOIVA_STATUS_LABEL[ag.status]}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/60 mt-0.5">
                    {pacote?.nome} ·
                    <span className="font-semibold text-foreground">{formatBRL(pacote?.preco ?? 0)}</span>
                    {' · '}
                    <span className="font-medium text-primary">
                      Sinal: {formatBRL((pago < (pacote?.preco ?? 0) * NOIVA_SINAL_MIN_PCT / 100) ? pago : (pacote?.preco ?? 0) * NOIVA_SINAL_MIN_PCT / 100)} / {formatBRL(((pacote?.preco ?? 0) * NOIVA_SINAL_MIN_PCT) / 100)} ({Math.min(100, Math.round((pago / (pacote?.preco ?? 1)) * 100))}%)
                    </span>
                  </p>
                  <p className="text-xs text-foreground/50 mt-1">
                    Casamento {new Date(ag.data_evento + 'T12:00:00').toLocaleDateString('pt-BR')} · Serviço {new Date(ag.data_agendamento + 'T12:00:00').toLocaleDateString('pt-BR')} às {ag.hora} · {prof?.nome}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/admin/agenda?date=${ag.data_agendamento}`} className="inline-flex items-center gap-1.5 border border-[var(--border-subtle)] bg-white px-3.5 py-2 rounded-lg text-xs font-bold hover:border-primary/50 transition-colors">
                    <CalendarDays size={13} /> Agenda
                  </Link>
                  <button onClick={() => setPagamentoAberto(ag.id)} className="inline-flex items-center gap-1.5 bg-foreground text-background px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-foreground/85 transition-colors">
                    <CreditCard size={13} /> Pagamentos
                  </button>
                  <button onClick={() => setDetalheAberto(aberto ? null : ag.id)} className="inline-flex items-center gap-1.5 border border-[var(--border-subtle)] bg-white px-3.5 py-2 rounded-lg text-xs font-bold hover:border-primary/50 transition-colors">
                    {aberto ? 'Fechar' : 'Detalhes'}
                  </button>
                  {ag.status === 'sinal_pendente' && (
                    <button
                      onClick={() => excluirAgendamentoNoiva(ag.id)}
                      title="Cancelar agendamento"
                      className="inline-flex items-center gap-1.5 border border-danger/30 text-danger bg-card px-3 py-2 rounded-lg text-xs font-bold hover:bg-danger/10 transition-colors"
                    >
                      <XCircle size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Painel de detalhes / ações */}
              {aberto && (
                <div className="border-t border-[var(--border-subtle)] bg-[var(--background)] px-5 py-4 flex flex-col gap-3">
                  {ag.status === 'sinal_pendente' && (
                    <div className="flex items-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 text-xs rounded-lg px-4 py-3">
                      <AlertTriangle size={14} className="shrink-0" />
                      Aguardando sinal de {NOIVA_SINAL_MIN_PCT}% ({formatBRL(((pacote?.preco ?? 0) * NOIVA_SINAL_MIN_PCT) / 100)}) para confirmar. Enquanto isso, a data está apenas reservada.
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {ag.status === 'sinal_pago' && !podeConf && (
                      <button
                        onClick={() => setPagamentoAberto(ag.id)}
                        className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors"
                      >
                        <Receipt size={13} /> Completar Sinal ({formatBRL(Math.max(0, ((pacote?.preco ?? 0) * NOIVA_SINAL_MIN_PCT) / 100 - pago))})
                      </button>
                    )}
                    {(ag.status === 'sinal_pago' || ag.status === 'sinal_pendente') && podeConf && (
                      <button
                        onClick={() => atualizarStatusNoiva(ag.id, 'confirmado')}
                        className="inline-flex items-center gap-1.5 bg-success text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-success/90 transition-colors"
                      >
                        <CheckCircle2 size={13} /> Confirmar Agendamento (Sinal ≥ {NOIVA_SINAL_MIN_PCT}%)
                      </button>
                    )}
                    {ag.status === 'confirmado' && (
                      <button
                        onClick={() => atualizarStatusNoiva(ag.id, 'concluido')}
                        className="inline-flex items-center gap-1.5 bg-foreground text-background px-4 py-2 rounded-lg text-xs font-bold hover:bg-foreground/85 transition-colors"
                      >
                        <Check size={13} /> Marcar como Concluído
                      </button>
                    )}
                    {ag.status === 'confirmado' && (
                      <button
                        onClick={() => atualizarStatusNoiva(ag.id, 'sinal_pago')}
                        className="inline-flex items-center gap-1.5 border border-danger/30 text-danger bg-card px-4 py-2 rounded-lg text-xs font-bold hover:bg-danger/10 transition-colors"
                      >
                        <XCircle size={13} /> Reverter Confirmação
                      </button>
                    )}
                  </div>
                  {pagos.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2">Histórico de Pagamentos</h4>
                      <div className="flex flex-col gap-1.5">
                        {pagos.map(pg => (
                          <div key={pg.id} className="flex items-center justify-between bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm">
                            <span className="capitalize font-medium">{pg.tipo === 'sinal' ? `Sinal (${NOIVA_SINAL_MIN_PCT}%)` : pg.tipo === 'final' ? 'Pagamento final' : 'Complemento'} — {pg.forma.toUpperCase()}</span>
                            <span className="font-bold text-success">{formatBRL(pg.valor)} <span className="text-xs font-normal text-foreground/50">· {pg.data_pagamento ? new Date(pg.data_pagamento).toLocaleDateString('pt-BR') : ''}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal de pagamento */}
              {pagamentoAberto === ag.id && pacote && (
                <PagamentoModal
                  pacote={pacote}
                  ag={ag}
                  pagos={pagos}
                  onClose={() => setPagamentoAberto(null)}
                  copiarPix={copiarPix}
                  copiado={copiado}
                  onRegistrar={async (params) => {
                    await registrarPagamentoNoiva({ ...params, pacote_preco: pacote.preco });
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PagamentoModal({
  pacote, ag, pagos, onClose, copiarPix, copiado, onRegistrar,
}: {
  pacote: ReturnType<typeof getNoivaPacotes>[number];
  ag: AgendamentoNoiva;
  pagos: any[];
  onClose: () => void;
  copiarPix: (c: string) => void;
  copiado: boolean;
  onRegistrar: (p: { agendamento_id: string; tipo: 'sinal' | 'complemento' | 'final'; valor: number; forma: 'pix' | 'cartao' | 'dinheiro' | 'transferencia'; comprovante?: string | null; pixCopiaCola?: string | null }) => Promise<void> | void;
}) {
  const pago = totalPago(ag.id);
  const sinalAlvo = (pacote.preco * NOIVA_SINAL_MIN_PCT) / 100;
  const restanteSinal = Math.max(0, sinalAlvo - pago);
  const [tipo, setTipo] = useState<'sinal' | 'complemento' | 'final'>(pago === 0 ? 'sinal' : 'final');
  const [forma, setForma] = useState<'pix' | 'cartao' | 'dinheiro' | 'transferencia'>('pix');
  const [valor, setValor] = useState<number>(pago === 0 ? sinalAlvo : pacote.preco - pago);
  const [pixGerado, setPixGerado] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [comprovante, setComprovante] = useState<string | null>(null);
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);

  const gerarPix = async () => {
    const descricao = `Sinal ${ag.nome_noiva} - ${pacote.nome}`;
    // Se o Mercado Pago estiver configurado, gera o PIX real (QR Code + copia-e-cola oficiais)
    const mpAtivo = await isMPAtivo();
    if (mpAtivo) {
      criarPixMercadoPago(valor, descricao)
        .then(res => {
          // No modal de noivas armazenamos o código copia-e-cola real e o QR Code
          onRegistrar({
            agendamento_id: ag.id,
            tipo,
            valor,
            forma: 'pix',
            pixCopiaCola: res.copia_e_cola,
          });
          setQrBase64(res.qrcode_base64);
        })
        .catch(() => {
          // Fallback: mantém o código PIX de demonstração
          setPixGerado(gerarPixCopiaCola(valor, descricao));
        });
    } else {
      setPixGerado(gerarPixCopiaCola(valor, descricao));
    }
  };

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setComprovante(String(reader.result));
    reader.readAsDataURL(f);
  };

  const confirmar = async () => {
    try {
      await onRegistrar({
        agendamento_id: ag.id,
        tipo,
        valor,
        forma,
        comprovante,
        pixCopiaCola: pixGerado,
      });
      onClose();
    } catch (err: any) {
      console.error('Erro ao confirmar pagamento:', err);
      alert('Erro ao salvar pagamento: ' + (err.message || 'Erro desconhecido. Verifique o console.'));
    }
  };

  const tiposDisponiveis: { id: 'sinal' | 'complemento' | 'final'; label: string; disabled?: boolean }[] = [
    { id: 'sinal', label: `Sinal ${NOIVA_SINAL_MIN_PCT}% (${formatBRL(sinalAlvo)})`, disabled: pago >= sinalAlvo },
    { id: 'complemento', label: 'Complemento', disabled: pago >= sinalAlvo && pago >= pacote.preco },
    { id: 'final', label: `Final (${formatBRL(Math.max(0, pacote.preco - pago))})`, disabled: pacote.preco - pago <= 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between sticky top-0 bg-card rounded-t-2xl">
          <div>
            <h3 className="font-bold">Pagamento — {ag.nome_noiva}</h3>
            <p className="text-xs text-foreground/60 mt-0.5">{pacote.nome} · Total {formatBRL(pacote.preco)}</p>
          </div>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground p-1"><XCircle size={20} /></button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Resumo financeiro */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-foreground/50 font-bold">Total</div>
              <div className="font-bold">{formatBRL(pacote.preco)}</div>
            </div>
            <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-success font-bold">Pago</div>
              <div className="font-bold text-success">{formatBRL(pago)}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Sinal alvo ({NOIVA_SINAL_MIN_PCT}%)</div>
              <div className="font-bold text-amber-700">{formatBRL(sinalAlvo)}</div>
            </div>
          </div>

          {/* Tipo de pagamento */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">Tipo de pagamento</label>
            <div className="flex flex-col gap-2">
              {tiposDisponiveis.map(t => (
                <label key={t.id} className={`flex items-center gap-3 border rounded-lg px-4 py-3 text-sm cursor-pointer transition-colors ${tipo === t.id ? 'border-primary bg-primary/5 font-bold' : 'border-[var(--border-subtle)]' } ${t.disabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  <input type="radio" name="tipo-pag" checked={tipo === t.id} onChange={() => { setTipo(t.id); setValor(t.id === 'final' ? Math.max(0, pacote.preco - pago) : t.id === 'sinal' ? Math.min(sinalAlvo, Math.max(0, sinalAlvo - pago)) : 100); }} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">Valor (R$)</label>
            <input
              type="number"
              min={1}
              step="0.01"
              value={valor}
              onChange={e => setValor(Number(e.target.value))}
              className="bg-card border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Forma de pagamento */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">Forma de pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              {(['pix', 'cartao', 'transferencia', 'dinheiro'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setForma(f); if (f !== 'pix') setPixGerado(null); }}
                  className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-2.5 text-sm font-medium capitalize transition-colors ${forma === f ? 'border-primary bg-primary/5 font-bold' : 'border-[var(--border-subtle)]'}`}
                >
                  <QrCode size={14} /> {f}
                </button>
              ))}
            </div>
          </div>

          {/* PIX copia e cola */}
          {forma === 'pix' && (
            <div className="flex flex-col gap-2">
              {(pixGerado || qrBase64) ? (
                <div className="bg-foreground text-background rounded-lg p-4 flex flex-col gap-3">
                  {qrBase64 ? (
                    <div className="flex flex-col items-center gap-2 bg-background rounded-lg p-3 self-center">
                      <img src={`data:image/png;base64,${qrBase64}`} alt="QR Code PIX Mercado Pago" className="w-40 h-40 object-contain" />
                      <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-bold">PIX oficial — Mercado Pago</span>
                    </div>
                  ) : null}
                  {pixGerado ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-background/60 font-bold">PIX Copia e Cola</span>
                        <button onClick={() => copiarPix(pixGerado)} className="inline-flex items-center gap-1.5 bg-secondary text-foreground text-xs font-bold px-3 py-1.5 rounded-md hover:bg-card">
                          {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-[11px] font-mono break-all text-background/80">{pixGerado}</p>
                    </>
                  ) : (
                    <p className="text-xs text-success/80 font-bold flex items-center gap-2">
                      <CheckCircle2 size={14} /> Pagamento PIX criado no Mercado Pago — o código copia-e-cola foi registrado.
                    </p>
                  )}
                </div>
              ) : (
                <button type="button" onClick={gerarPix} className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm font-bold hover:bg-primary-hover transition-colors">
                  <QrCode size={16} /> Gerar PIX de {formatBRL(valor)}
                </button>
              )}
            </div>
          )}

          {/* Comprovante */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold">Comprovante (opcional)</label>
            <input
              ref={setFileInput}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button type="button" onClick={() => fileInput?.click()} className="inline-flex items-center justify-center gap-2 border border-[var(--border-subtle)] rounded-lg px-4 py-3 text-sm font-medium hover:border-primary/50 transition-colors">
              <Receipt size={15} /> {comprovante ? 'Comprovante anexado ✓' : 'Anexar comprovante'}
            </button>
          </div>

          {tipo === 'sinal' && pago === 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-4 py-3">
              <AlertTriangle size={14} className="shrink-0" />
              Após registrar este pagamento, o agendamento passará para <b>"Sinal Pago"</b> e poderá ser confirmado, protegendo a data na agenda.
            </div>
          )}

          <button
            onClick={confirmar}
            disabled={valor <= 0 || valor > pacote.preco - pago + 0.01}
            className="w-full bg-primary text-primary-foreground font-bold rounded-lg py-3 text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Registrar Pagamento de {formatBRL(valor)}
          </button>
        </div>
      </div>
    </div>
  );
}
