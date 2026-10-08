'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ViewToggle } from '@/components/ViewToggle';
import { fetchAgendamentos, fetchProfissionais, fetchBloqueios, fetchClientes, fetchServicos, fetchProfissionalServico, fetchEstoque, fetchTodosServicoProdutos, registrarMovimentacao, criarComissao, fetchItensComanda } from '@/lib/supabase-queries';
import {
  STATUS_LABELS, STATUS_COLORS, getServicoDuracao, getServicoPreco,
  getClienteNome, getServicoNome, getProfissionalNome
} from '@/lib/mock-data';
import type { Agendamento, BloqueioAgenda, StatusAgendamento, Cliente, Servico, ProfissionalServico, ProdutoEstoque, ServicoProduto, InsumoAtendimento, FormaPagamento } from '@/lib/gestao-types';
import type { Profissional } from '@/lib/gestao-types';
import { CalendarDays, Clock, User2, Check, X, CheckCircle2, AlertCircle, AlertTriangle, Sparkles, Beaker, CreditCard, Banknote, Smartphone, ShoppingBag } from 'lucide-react';
import { obterHorariosSalao, DEFAULT_HORARIOS_SALAO } from '@/lib/ia-config';

const DIAS_CHAVE = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function AgendaContent() {
  const searchParams = useSearchParams();
  const hoje = new Date().toISOString().split('T')[0];
  const [dataSelecionada, setDataSelecionada] = useState(searchParams.get('date') || hoje);
  const [profFiltro, setProfFiltro] = useState<string>('todos');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueiosDia, setBloqueiosDia] = useState<BloqueioAgenda[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profServicos, setProfServicos] = useState<ProfissionalServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<string>('dia');
  const [showForm, setShowForm] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Agendamento | null>(null);
  
  // Checkout / Recebimento
  const [checkoutAppt, setCheckoutAppt] = useState<Agendamento | null>(null);
  const [checkoutExtras, setCheckoutExtras] = useState<Array<{ id: string; servicoId: string; preco: number }>>([]);
  const [extraServiceSelect, setExtraServiceSelect] = useState<string>('');
  // Insumos (pesagem)
  const [estoque, setEstoque] = useState<ProdutoEstoque[]>([]);
  const [servicoProdutos, setServicoProdutos] = useState<ServicoProduto[]>([]);
  const [checkoutInsumos, setCheckoutInsumos] = useState<InsumoAtendimento[]>([]);
  const [checkoutProdutos, setCheckoutProdutos] = useState<Array<{ id: string; inventory_id: string; qty: number; preco: number }>>([]);
  // Pagamento e comissão
  const [checkoutPagamento, setCheckoutPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [checkoutParcelas, setCheckoutParcelas] = useState<number>(1);

  const [formData, setFormData] = useState({
    cliente_id: '',
    profissional_id: '',
    servico_id: '',
    data: hoje,
    hora_inicio: '09:00',
    duracao_min: '',
    is_fixed: false,
    recurrence_type: 'WEEKLY',
    recurrence_custom_day: '',
    allow_overlap: false,
  });

  // Carregar dados do Supabase (com fallback para mock)
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      
      const urlParams = new URLSearchParams(window.location.search);
      const agendamentoIdConfirmar = urlParams.get('confirmar');
      const agendamentoIdCancelar = urlParams.get('cancelar');

      if (agendamentoIdConfirmar) {
        await mudarStatus(agendamentoIdConfirmar, 'confirmado');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (agendamentoIdCancelar) {
        await mudarStatus(agendamentoIdCancelar, 'cancelado');
        window.history.replaceState({}, '', window.location.pathname);
      }

      const [
        agendamentosData, bloqueiosData, profissionaisData, clientesData, servicosData, profServData
      ] = await Promise.all([
        fetchAgendamentos(),
        fetchBloqueios(),
        fetchProfissionais(),
        fetchClientes(),
        fetchServicos(),
        fetchProfissionalServico()
      ]);
      setAgendamentos(agendamentosData);
      setBloqueiosDia(bloqueiosData);
      setProfissionais(profissionaisData.filter(p => p.ativo));
      setClientes(clientesData);
      setServicos(servicosData);
      setProfServicos(profServData);
      // Carrega estoque e vínculos serviço-produto
      const [estoqueData, spData] = await Promise.all([fetchEstoque(true), fetchTodosServicoProdutos()]);
      setEstoque(estoqueData);
      setServicoProdutos(spData);
      setLoading(false);
    };
    carregarDados();
  }, [dataSelecionada]);

  // Filtro por data e profissional na visualização
  const doDia = agendamentos.filter(a => a.data === dataSelecionada);
  const agendamentosFiltrados = profFiltro === 'todos'
    ? doDia
    : doDia.filter(a => a.profissional_id === profFiltro);

  agendamentosFiltrados.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const bloqueiosFiltrados = bloqueiosDia.filter(b => {
    const matchProf = profFiltro === 'todos' || profFiltro === b.profissional_id;
    const matchData = b.data_inicio.slice(0, 10) === dataSelecionada || b.data_fim.slice(0, 10) === dataSelecionada;
    return matchProf && matchData;
  });

  // Serviços filtrados pelo profissional selecionado no formulário
  const servicosDoProfissional = useMemo(() => {
    if (!formData.profissional_id) return [];
    const idsVinculados = profServicos
      .filter(ps => ps.profissional_id === formData.profissional_id)
      .map(ps => ps.servico_id);
    
    // Se houver vínculos específicos cadastrados, filtra por eles; senão mostra os serviços ativos
    if (idsVinculados.length > 0) {
      return servicos.filter(s => s.ativo && idsVinculados.includes(s.id));
    }
    return servicos.filter(s => s.ativo);
  }, [formData.profissional_id, profServicos, servicos]);

  // Horários disponíveis calculados cruzando Salão + Profissional + Agendamentos existentes
  const { horariosDisponiveis, statusDiaInfo } = useMemo(() => {
    if (!formData.data || !formData.profissional_id) {
      return { horariosDisponiveis: [], statusDiaInfo: null };
    }

    const [ano, mes, dia] = formData.data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.getDay();
    const horariosSalao = typeof window !== 'undefined' ? obterHorariosSalao() : DEFAULT_HORARIOS_SALAO;
    const infoSalao = horariosSalao[diaSemana] || DEFAULT_HORARIOS_SALAO[diaSemana];
    const profSel = profissionais.find(p => p.id === formData.profissional_id);
    const jornadaProf = profSel?.jornada_semanal;

    // Verificar se o profissional trabalha neste dia
    let profAtende = false;
    let profInicio = infoSalao?.inicio || '09:00';
    let profFim = infoSalao?.fim || '19:00';

    if (jornadaProf) {
      const chaveStr = DIAS_CHAVE[diaSemana];
      const cfgDia = jornadaProf[diaSemana] || (chaveStr ? jornadaProf[chaveStr] : undefined);
      if (cfgDia) {
        if (cfgDia.ativo !== false) {
          profAtende = true;
          profInicio = cfgDia.inicio || profInicio;
          profFim = cfgDia.fim || profFim;
        }
      } else if (infoSalao.aberto) {
        profAtende = true;
      }
    } else if (infoSalao.aberto) {
      profAtende = true;
    }

    if (!profAtende && !infoSalao.aberto) {
      return {
        horariosDisponiveis: [],
        statusDiaInfo: { tipo: 'fechado', texto: `Salão e profissional fechados aos domingos/segundas.` }
      };
    }

    if (!profAtende) {
      return {
        horariosDisponiveis: [],
        statusDiaInfo: { tipo: 'folga', texto: `${profSel?.nome || 'Profissional'} não atende neste dia da semana.` }
      };
    }

    // Gerar slots de 30 em 30 minutos
    const [hIni, mIni] = profInicio.split(':').map(Number);
    const [hFim, mFim] = profFim.split(':').map(Number);
    const totalMinutosIni = hIni * 60 + mIni;
    const totalMinutosFim = hFim * 60 + mFim;

    // Agendamentos já marcados para o profissional nesta data
    const ocupados = agendamentos
      .filter(a => a.data === formData.data && a.profissional_id === formData.profissional_id && a.status !== 'cancelado')
      .map(a => a.hora_inicio.slice(0, 5));

    const isAgnaldo = (profSel?.nome || '').toLowerCase().includes('agnaldo') || profSel?.id === 'agnaldo';
    const interval = isAgnaldo ? 20 : 30;

    const slots: Array<{ hora: string; ocupado: boolean }> = [];
    for (let m = totalMinutosIni; m < totalMinutosFim; m += interval) {
      const hStr = String(Math.floor(m / 60)).padStart(2, '0');
      const minStr = String(m % 60).padStart(2, '0');
      const horaFormatada = `${hStr}:${minStr}`;
      slots.push({
        hora: horaFormatada,
        ocupado: ocupados.includes(horaFormatada),
      });
    }

    return {
      horariosDisponiveis: slots,
      statusDiaInfo: {
        tipo: 'aberto',
        texto: `Horário do profissional: ${profInicio} às ${profFim}`
      }
    };
  }, [formData.data, formData.profissional_id, profissionais, agendamentos]);

  async function mudarStatus(id: string, status: StatusAgendamento) {
    try {
      const { atualizarStatusAgendamento } = await import('@/lib/supabase-queries');
      const success = await atualizarStatusAgendamento(id, status);
      
      if (success) {
        // Atualizar estado local
        setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        
        // Sincronizar com Bolten CRM (background, não bloqueia UI)
        try {
          await fetch('/api/bolten/sync-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agendamentoId: id, status }),
          });
        } catch (syncErr) {
          console.warn('[bolten-sync] Falha ao sincronizar status:', syncErr);
        }
      } else {
        setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
  }

  const abrirCheckout = async (appt: Agendamento) => {
    setCheckoutAppt(appt);
    setCheckoutExtras([]);
    setCheckoutInsumos([]);
    setCheckoutProdutos([]);
    setCheckoutPagamento('DINHEIRO');
    setCheckoutParcelas(1);

    const itens = await fetchItensComanda(appt.id);
    
    // Insumos
    const insumosDaComanda = itens.filter(i => i.type === 'INSUMO');
    const mapInsumos: InsumoAtendimento[] = insumosDaComanda.map(i => {
      const prod = estoque.find(p => p.id === i.inventory_id);
      const custoUn = prod?.cost_price || 0;
      return {
        inventory_id: i.inventory_id,
        name: prod?.name || 'Insumo',
        unit: prod?.unit || 'GR',
        price_per_gram: prod?.cost_price || 0,
        qty_used: i.qty,
        custo_unitario: custoUn,
        custo_total: custoUn * i.qty
      };
    });
    
    // Merge com insumos padrão do serviço se o profissional não tiver lançado?
    // O ideal é a secretária ver só o que o profissional lançou, ou preencher manualmente se faltar.
    // Vamos apenas carregar os lançados na comanda.
    setCheckoutInsumos(mapInsumos);

    // Produtos (Upsell)
    const produtosDaComanda = itens.filter(i => i.type === 'PRODUTO');
    const mapProdutos = produtosDaComanda.map(i => {
      return {
        id: Date.now().toString() + i.id, // Random id for list
        inventory_id: i.inventory_id,
        qty: i.qty,
        preco: i.price
      };
    });
    setCheckoutProdutos(mapProdutos);
  };

  const abrirFormNovo = (hora: string, profId: string) => {
    setFormData({
      cliente_id: '',
      profissional_id: profId,
      servico_id: '',
      data: dataSelecionada,
      hora_inicio: hora,
      duracao_min: '',
      is_fixed: false,
      recurrence_type: 'WEEKLY',
      recurrence_custom_day: '',
      allow_overlap: false,
    });
    setShowForm(true);
  };

  const handleSalvarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.profissional_id || !formData.servico_id || !formData.data || !formData.hora_inicio) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    const servicoSel = servicos.find(s => s.id === formData.servico_id);
    const duracaoMin = formData.duracao_min ? parseInt(formData.duracao_min) : (servicoSel?.duracao_min ?? 60);
    const [h, m] = formData.hora_inicio.split(':').map(Number);
    const fim = new Date(2000, 0, 1, h, m + duracaoMin);
    const horaFim = `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`;
    
    try {
      const res = await fetch('/api/agendamentos/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: formData.cliente_id,
          profissional_id: formData.profissional_id,
          servico_id: formData.servico_id,
          data: formData.data,
          hora_inicio: formData.hora_inicio,
          hora_fim: horaFim,
          status: 'confirmado',
          canal: 'recepcao',
          is_fixed: formData.is_fixed,
          recurrence_type: formData.is_fixed ? formData.recurrence_type : null,
          recurrence_custom_day: (formData.is_fixed && formData.recurrence_type === 'CUSTOM') ? parseInt(formData.recurrence_custom_day) : null,
          allow_overlap: formData.allow_overlap
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar agendamento');

      const novoAgendamento: Agendamento = {
        id: data.agendamento?.id ?? Date.now().toString(36),
        cliente_id: formData.cliente_id,
        profissional_id: formData.profissional_id,
        servico_id: formData.servico_id,
        data: formData.data,
        hora_inicio: formData.hora_inicio,
        hora_fim: horaFim,
        status: 'confirmado',
        canal: 'recepcao',
        criado_em: data.agendamento?.created_at ?? new Date().toISOString()
      };
      setAgendamentos(prev => [...prev, novoAgendamento]);
      setDataSelecionada(formData.data); // Navega automaticamente para o dia agendado
      setShowForm(false);
      setFormData({ cliente_id: '', profissional_id: '', servico_id: '', data: hoje, hora_inicio: '09:00', duracao_min: '', is_fixed: false, recurrence_type: 'WEEKLY', recurrence_custom_day: '', allow_overlap: false });
    } catch (err: any) {
      console.error('Erro ao salvar agendamento:', err);
      alert(`Erro ao salvar no banco: ${err.message}`);
    }
  };

  return (
    <div className="py-4">
      <SectionTitle title="Agenda do Salão" subtitle="Gerenciamento de horários e profissionais" align="left" />

      {/* Filtro Profissionais (Cards) */}
      <div className="mt-8 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
          <button
            onClick={() => setProfFiltro('todos')}
            className={`shrink-0 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
              profFiltro === 'todos' 
                ? 'bg-gold border-gold text-background shadow-md' 
                : 'bg-[var(--color-card)] border-[var(--border-subtle)] text-foreground/70 hover:border-gold/50 hover:bg-white/5'
            }`}
          >
            Todos
          </button>
          {profissionais.map(p => (
            <button
              key={p.id}
              onClick={() => setProfFiltro(p.id)}
              className={`shrink-0 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 ${
                profFiltro === p.id 
                  ? 'bg-gold border-gold text-background shadow-md' 
                  : 'bg-[var(--color-card)] border-[var(--border-subtle)] text-foreground/70 hover:border-gold/50 hover:bg-white/5'
              }`}
            >
              {p.foto_url ? (
                <img src={p.foto_url} alt={p.nome} className="w-5 h-5 rounded-full object-cover border border-background/20" />
              ) : (
                <User2 size={16} className={profFiltro === p.id ? 'text-background/80' : 'text-gold'} />
              )}
              {p.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Controles de Busca / Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-1">
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              onClick={(e) => {
                if (typeof (e.target as any).showPicker === 'function') {
                  (e.target as any).showPicker();
                }
              }}
              className="bg-transparent px-3 py-1.5 text-sm text-foreground focus:outline-none cursor-pointer w-full font-medium"
            />
          </div>
          {dataSelecionada !== hoje && (
            <button
              onClick={() => setDataSelecionada(hoje)}
              className="bg-gold/10 text-gold border border-gold/20 hover:bg-gold hover:text-background transition-colors text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg h-[38px]"
              title="Ir para hoje"
            >
              Hoje
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div className="sm:ml-auto flex gap-2 w-full sm:w-auto">
          <ViewToggle 
            options={[
              { id: 'dia', label: 'Dia' },
              { id: 'semana', label: 'Semana' },
            ]}
            selectedId={viewMode} 
            onChange={setViewMode} 
          />
          <Button variant="primary" onClick={() => setShowForm(true)}>+ Novo Agendamento</Button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-foreground/50">Carregando horários...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Bloqueios do Dia */}
          {bloqueiosFiltrados.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <h4 className="text-amber-500 font-bold text-sm mb-2 flex items-center gap-2">
                <AlertCircle size={16} /> Bloqueios de Horário
              </h4>
              <div className="flex flex-wrap gap-2">
                {bloqueiosFiltrados.map((b) => (
                  <span key={b.id} className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md">
                    {getProfissionalNome(b.profissional_id, profissionais)}: {b.data_inicio.includes('T') ? b.data_inicio.slice(11, 16) : b.data_inicio} - {b.data_fim.includes('T') ? b.data_fim.slice(11, 16) : b.data_fim} ({b.motivo})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Agenda Kanban (Colunas por Profissional) */}
          <div className="overflow-x-auto w-full pb-4">
            <div className="flex border border-[var(--border-subtle)] rounded-xl bg-[var(--color-card)] overflow-hidden shadow-sm min-h-[600px] w-max min-w-full">
              {profissionais.filter(p => profFiltro === 'todos' || p.id === profFiltro).map(prof => {
                const isAgnaldo = (prof.nome || '').toLowerCase().includes('agnaldo') || prof.id === 'agnaldo';
                const interval = isAgnaldo ? 20 : 30;

                const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
                const dataObj = new Date(ano, mes - 1, dia);
                const diaSemana = dataObj.getDay();
                
                const horariosSalao = typeof window !== 'undefined' ? obterHorariosSalao() : DEFAULT_HORARIOS_SALAO;
                const infoSalao = horariosSalao[diaSemana] || DEFAULT_HORARIOS_SALAO[diaSemana];
                
                let profInicio = infoSalao?.inicio || '09:00';
                let profFim = infoSalao?.fim || '19:00';
                let profAtende = false;
                
                const jornadaProf = prof.jornada_semanal;
                let intInicio = '';
                let intFim = '';

                if (jornadaProf) {
                  const chaveStr = DIAS_CHAVE[diaSemana];
                  const cfgDia = jornadaProf[diaSemana] || (chaveStr ? jornadaProf[chaveStr] : undefined);
                  if (cfgDia) {
                    if (cfgDia.ativo !== false) {
                      profAtende = true;
                      profInicio = cfgDia.inicio || profInicio;
                      profFim = cfgDia.fim || profFim;
                      intInicio = cfgDia.intervalo_inicio || '';
                      intFim = cfgDia.intervalo_fim || '';
                    } else {
                      profAtende = false;
                    }
                  } else if (infoSalao.aberto) {
                    profAtende = true;
                  }
                } else if (infoSalao.aberto) {
                  profAtende = true;
                }

                const slots: string[] = [];
                if (profAtende) {
                  const [hIni, mIni] = profInicio.split(':').map(Number);
                  const [hFim, mFim] = profFim.split(':').map(Number);
                  const totalMinutosIni = hIni * 60 + mIni;
                  const totalMinutosFim = hFim * 60 + mFim;
                  
                  let totalIntIni = -1;
                  let totalIntFim = -1;
                  if (intInicio && intFim) {
                    const [hiI, miI] = intInicio.split(':').map(Number);
                    totalIntIni = hiI * 60 + miI;
                    const [hiF, miF] = intFim.split(':').map(Number);
                    totalIntFim = hiF * 60 + miF;
                  }

                  for (let m = totalMinutosIni; m < totalMinutosFim; m += interval) {
                    if (totalIntIni > -1 && m >= totalIntIni && m < totalIntFim) {
                      continue;
                    }
                    const hStr = String(Math.floor(m / 60)).padStart(2, '0');
                    const minStr = String(m % 60).padStart(2, '0');
                    slots.push(`${hStr}:${minStr}`);
                  }
                }

                return (
                  <div key={prof.id} className="flex-1 min-w-[280px] border-r border-[var(--border-subtle)] last:border-0 flex flex-col bg-black/5">
                    {/* Cabeçalho */}
                    <div className="p-3 flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--color-card)] sticky top-0 z-10">
                      {prof.foto_url ? (
                        <img src={prof.foto_url} alt={prof.nome} className="w-10 h-10 rounded-full object-cover border-2 border-gold/50 shadow-sm shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gold/10 border-2 border-gold/20 flex items-center justify-center shadow-sm shrink-0">
                          <User2 size={20} className="text-gold" />
                        </div>
                      )}
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-foreground text-sm uppercase tracking-wide leading-tight">{prof.nome}</span>
                        <div className="text-[10px] text-foreground/50 mt-0.5">
                          {profAtende ? `${profInicio} às ${profFim}` : 'Não atende'}
                          {intInicio && ` (Pausa: ${intInicio}-${intFim})`}
                        </div>
                      </div>
                    </div>

                    {/* Slots */}
                    <div className="flex flex-col p-2 gap-2 h-full relative">
                      {!profAtende && (
                        <div className="absolute inset-0 flex items-center justify-center text-foreground/30 text-xs font-mono bg-[var(--background)]">
                          INDISPONÍVEL
                        </div>
                      )}
                      {profAtende && slots.length === 0 && (
                        <div className="text-center text-xs text-foreground/50 mt-4">Nenhum horário disponível.</div>
                      )}
                      
                      {profAtende && slots.map(time => {
                        const appts = agendamentosFiltrados.filter(a => a.profissional_id === prof.id && a.hora_inicio === time && a.status !== 'cancelado');
                        
                        return (
                          <div key={time} className="flex border border-[var(--border-subtle)] rounded-lg bg-[var(--background)] shadow-sm min-h-[65px] group relative overflow-hidden transition-colors hover:border-gold/30">
                            {/* Left Time label */}
                            <div className="w-14 bg-black/5 border-r border-[var(--border-subtle)] flex items-center justify-center text-[12px] font-mono font-bold text-foreground/70 shrink-0">
                              {time}
                            </div>
                            
                            {/* Appts or Add */}
                            <div className="flex-1 p-1.5 flex flex-col justify-center relative">
                              {appts.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 cursor-pointer" onClick={() => abrirFormNovo(time, prof.id)}>
                                  <span className="text-[10px] text-gold/80 hover:text-gold uppercase font-bold tracking-wider px-2 py-1 bg-gold/10 rounded">
                                    + Agendar
                                  </span>
                                </div>
                              ) : (
                                appts.map(a => {
                                  const cliente = getClienteNome(a.cliente_id, clientes);
                                  const servico = getServicoNome(a.servico_id, servicos);
                                  return (
                                    <div 
                                      key={a.id} 
                                      onClick={() => setSelectedAppt(a)}
                                      className="text-xs bg-[var(--color-card)] border border-[var(--border-subtle)] rounded p-2 cursor-pointer hover:border-gold/50 transition-colors shadow-sm relative overflow-hidden h-full flex flex-col justify-center"
                                    >
                                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: STATUS_COLORS[a.status] }}></div>
                                      <div className="pl-2">
                                        <div className="font-bold truncate text-foreground/90 leading-tight" title={cliente}>{cliente}</div>
                                        <div className="text-gold/80 truncate text-[10px] font-medium leading-tight mt-1" title={servico}>{servico}</div>
                                        <div className="text-[9px] mt-1 text-foreground/50 uppercase">{STATUS_LABELS[a.status]}</div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ações do Agendamento */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/[0.7] backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {getClienteNome(selectedAppt.cliente_id, clientes)}
                </h3>
                <p className="text-sm text-gold">
                  {getServicoNome(selectedAppt.servico_id, servicos)}
                </p>
              </div>
              <button onClick={() => setSelectedAppt(null)} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-2 mb-6 text-sm text-foreground/80">
              <p><strong>Data:</strong> {new Date(`${selectedAppt.data}T12:00:00`).toLocaleDateString('pt-BR')}</p>
              <p><strong>Horário:</strong> {selectedAppt.hora_inicio}</p>
              <p><strong>Profissional:</strong> {getProfissionalNome(selectedAppt.profissional_id, profissionais)}</p>
              <p><strong>Status Atual:</strong> {STATUS_LABELS[selectedAppt.status]}</p>
            </div>

            <div className="flex flex-col gap-2">
              {selectedAppt.status === 'pendente' && (
                <Button variant="primary" onClick={() => { mudarStatus(selectedAppt.id, 'confirmado'); setSelectedAppt(null); }}>
                  <Check size={16} className="mr-2"/> Confirmar
                </Button>
              )}
              {selectedAppt.status === 'confirmado' && (
                <Button variant="primary" onClick={() => { mudarStatus(selectedAppt.id, 'em_atendimento'); setSelectedAppt(null); }}>
                  <User2 size={16} className="mr-2"/> Iniciar Atendimento
                </Button>
              )}
              {selectedAppt.status === 'em_atendimento' && (
                <Button variant="primary" onClick={() => { abrirCheckout(selectedAppt); setSelectedAppt(null); }}>
                  <CheckCircle2 size={16} className="mr-2"/> Concluir
                </Button>
              )}

              {selectedAppt.status !== 'concluido' && selectedAppt.status !== 'cancelado' && selectedAppt.status !== 'no_show' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/10" onClick={() => { mudarStatus(selectedAppt.id, 'cancelado'); setSelectedAppt(null); }}>
                    Cancelar
                  </Button>
                  <Button variant="outline" className="text-purple-400 border-purple-500/20 hover:bg-purple-500/10" onClick={() => { mudarStatus(selectedAppt.id, 'no_show'); setSelectedAppt(null); }}>
                    Faltou
                  </Button>
                </div>
              )}
            </div>
          </CardGlass>
        </div>
      )}

      {/* Modal de Finalização (Checkout / Recebimento) */}
      {checkoutAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/[0.7] backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-xl p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-serif text-foreground">Finalizar Atendimento</h3>
              <button onClick={() => { setCheckoutAppt(null); setCheckoutExtras([]); setExtraServiceSelect(''); setCheckoutInsumos([]); setCheckoutPagamento('DINHEIRO'); setCheckoutParcelas(1); }} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-5">
              {/* Resumo do Principal */}
              <div className="p-4 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg">
                <p className="text-sm text-foreground/60">Serviço Agendado:</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="font-bold">{getServicoNome(checkoutAppt.servico_id, servicos)}</p>
                  <p className="font-bold text-gold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getServicoPreco(checkoutAppt.servico_id, servicos))}
                  </p>
                </div>
              </div>

              {/* Serviços Extras */}
              <div>
                <h4 className="text-sm font-bold text-foreground mb-3">Serviços Adicionais Realizados <span className="text-foreground/30 font-normal">(opcional)</span></h4>
                <div className="flex gap-2 mb-4">
                  <select
                    value={extraServiceSelect}
                    onChange={(e) => setExtraServiceSelect(e.target.value)}
                    className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold"
                  >
                    <option value="">Selecione um serviço extra...</option>
                    {servicos.filter(s => s.ativo).map(s => (
                      <option key={s.id} value={s.id}>{s.nome} - R$ {s.preco.toFixed(2)}</option>
                    ))}
                  </select>
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => {
                      if (!extraServiceSelect) return;
                      const srv = servicos.find(s => s.id === extraServiceSelect);
                      if (srv) {
                        setCheckoutExtras([...checkoutExtras, { id: Date.now().toString(), servicoId: srv.id, preco: srv.preco }]);
                        setExtraServiceSelect('');
                      }
                    }}
                  >
                    Adicionar
                  </Button>
                </div>

                {checkoutExtras.length > 0 && (
                  <div className="space-y-2">
                    {checkoutExtras.map((extra, idx) => (
                      <div key={extra.id} className="flex justify-between items-center p-3 bg-[var(--background)]/50 rounded-lg text-sm border border-[var(--border-subtle)]">
                        <div className="flex-1 truncate pr-4">
                          {getServicoNome(extra.servicoId, servicos)}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground/50">R$</span>
                            <input 
                              type="number" 
                              step="0.01" 
                              className="w-24 bg-[var(--background)] border border-[var(--border-subtle)] rounded-md pl-8 pr-2 py-1 text-right focus:outline-none focus:border-gold" 
                              value={extra.preco}
                              onChange={(e) => {
                                const newExtras = [...checkoutExtras];
                                newExtras[idx].preco = parseFloat(e.target.value) || 0;
                                setCheckoutExtras(newExtras);
                              }}
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setCheckoutExtras(checkoutExtras.filter(e => e.id !== extra.id))}
                            className="text-red-500 hover:text-red-600 p-1 bg-red-500/10 rounded-md"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* INSUMOS (Pesagem) — aparece apenas se o serviço tiver produtos vinculados */}
              {(() => {
                const produtosDoServico = servicoProdutos
                  .filter(sp => sp.service_id === checkoutAppt.servico_id)
                  .map(sp => ({ sp, prod: estoque.find(e => e.id === sp.inventory_id) }))
                  .filter(x => x.prod);
                
                if (produtosDoServico.length === 0) return null;

                return (
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <Beaker size={15} className="text-amber-400" />
                      Insumos Utilizados (Pesagem)
                    </h4>
                    <div className="space-y-2">
                      {produtosDoServico.map(({ sp, prod }) => {
                        const insumo = checkoutInsumos.find(i => i.inventory_id === sp.inventory_id);
                        const qty = insumo?.qty_used ?? sp.default_qty_g;
                        const ppg = prod!.price_per_gram ?? 0;
                        const custo = qty * ppg;
                        return (
                          <div key={sp.id} className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium">{prod!.name}</p>
                                {ppg > 0 && <p className="text-xs text-foreground/50">R$ {ppg.toFixed(4)}/{prod!.unit}</p>}
                              </div>
                              {sp.is_required && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Obrigatório</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="text-xs text-foreground/50">Qtd. usada ({prod!.unit})</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="number" min={0} step={0.1}
                                    value={qty}
                                    onChange={e => {
                                      const newQty = parseFloat(e.target.value) || 0;
                                      const custTotal = newQty * ppg;
                                      setCheckoutInsumos(prev => {
                                        const others = prev.filter(i => i.inventory_id !== sp.inventory_id);
                                        return [...others, {
                                          inventory_id: sp.inventory_id,
                                          name: prod!.name,
                                          unit: prod!.unit,
                                          price_per_gram: ppg,
                                          qty_used: newQty,
                                          custo_total: custTotal,
                                        }];
                                      });
                                    }}
                                    className="w-28 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-sm focus:outline-none focus:border-gold"
                                  />
                                  <span className="text-xs text-foreground/50">{prod!.unit}</span>
                                </div>
                              </div>
                              {ppg > 0 && (
                                <div className="text-right">
                                  <p className="text-xs text-foreground/50">Custo</p>
                                  <p className="font-bold text-amber-400">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custo)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* PRODUTOS (Upsell - Lançados pelo Profissional) */}
              {checkoutProdutos.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <ShoppingBag size={15} className="text-gold" />
                    Produtos Vendidos (Upsell)
                  </h4>
                  <div className="space-y-2">
                    {checkoutProdutos.map((prod) => {
                      const itemEstoque = estoque.find(e => e.id === prod.inventory_id);
                      return (
                        <div key={prod.id} className="flex justify-between items-center p-3 bg-gold/5 border border-gold/15 rounded-lg text-sm">
                          <div className="flex-1">
                            <span className="font-bold text-foreground">{itemEstoque?.name || 'Produto'}</span>
                            <span className="text-foreground/50 text-xs ml-2">{prod.qty}x</span>
                          </div>
                          <div className="font-bold text-gold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.preco * prod.qty)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FORMA DE PAGAMENTO */}
              <div>
                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <CreditCard size={15} className="text-blue-400" />
                  Forma de Pagamento
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {([
                    ['DINHEIRO', 'Dinheiro', Banknote, 'text-emerald-400 border-emerald-500/40'],
                    ['PIX', 'PIX', Smartphone, 'text-blue-400 border-blue-500/40'],
                    ['DEBITO', 'Débito', CreditCard, 'text-purple-400 border-purple-500/40'],
                    ['CREDITO', 'Crédito', CreditCard, 'text-amber-400 border-amber-500/40'],
                  ] as const).map(([val, label, Icon, cor]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { setCheckoutPagamento(val); if (val !== 'CREDITO') setCheckoutParcelas(1); }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                        checkoutPagamento === val
                          ? `${cor} bg-foreground/5`
                          : 'border-[var(--border-subtle)] text-foreground/50 hover:border-foreground/20'
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
                
                {/* Parcelas — apenas para crédito */}
                {checkoutPagamento === 'CREDITO' && (
                  <div>
                    <p className="text-xs text-foreground/60 mb-2">Número de parcelas:</p>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                        <button key={n} type="button"
                          onClick={() => setCheckoutParcelas(n)}
                          className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all ${
                            checkoutParcelas === n
                              ? 'border-amber-400 bg-amber-400/15 text-amber-400'
                              : 'border-[var(--border-subtle)] text-foreground/50 hover:border-foreground/20'
                          }`}
                        >
                          {n}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* TOTAL + COMISSÃO */}
              {(() => {
                const totalServico = getServicoPreco(checkoutAppt.servico_id, servicos);
                const totalExtras = checkoutExtras.reduce((acc, curr) => acc + curr.preco, 0);
                const totalInsumos = checkoutInsumos.reduce((acc, i) => acc + i.custo_total, 0);
                const totalProdutos = checkoutProdutos.reduce((acc, p) => acc + (p.preco * p.qty), 0);
                const totalGeral = totalServico + totalExtras + totalInsumos + totalProdutos;
                const numParcelas = checkoutPagamento === 'CREDITO' ? checkoutParcelas : 1;

                return (
                  <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
                    {/* Breakdown */}
                    {(totalExtras > 0 || totalInsumos > 0 || totalProdutos > 0) && (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-foreground/60">
                          <span>Serviço</span>
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalServico)}</span>
                        </div>
                        {totalExtras > 0 && (
                          <div className="flex justify-between text-foreground/60">
                            <span>Extras</span>
                            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExtras)}</span>
                          </div>
                        )}
                        {totalInsumos > 0 && (
                          <div className="flex justify-between text-amber-400">
                            <span>Insumos</span>
                            <span>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInsumos)}</span>
                          </div>
                        )}
                        {totalProdutos > 0 && (
                          <div className="flex justify-between text-gold">
                            <span>Produtos (Upsell)</span>
                            <span>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProdutos)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                      <div>
                        <p className="text-sm text-foreground/60 mb-1">Total a Receber</p>
                        <p className="text-2xl font-bold font-serif text-gold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}
                        </p>
                        {numParcelas > 1 && (
                          <p className="text-xs text-amber-400 mt-0.5">
                            {numParcelas}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral / numParcelas)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => { setCheckoutAppt(null); setCheckoutExtras([]); setExtraServiceSelect(''); setCheckoutInsumos([]); setCheckoutPagamento('DINHEIRO'); setCheckoutParcelas(1); }}>Cancelar</Button>
                        <Button variant="primary" className="flex-1 sm:flex-none" onClick={async () => {
                          // 1. Finalizar o atendimento principal
                          await mudarStatus(checkoutAppt.id, 'concluido');
                          
                          // 2. Registrar extras como agendamentos concluídos
                          if (checkoutExtras.length > 0) {
                            for (const ext of checkoutExtras) {
                              try {
                                await fetch('/api/agendamentos/admin', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    cliente_id: checkoutAppt.cliente_id,
                                    profissional_id: checkoutAppt.profissional_id,
                                    servico_id: ext.servicoId,
                                    data: checkoutAppt.data,
                                    hora_inicio: checkoutAppt.hora_inicio,
                                    status: 'concluido'
                                  })
                                });
                              } catch (e) {
                                console.error("Erro ao registrar serviço extra", e);
                              }
                            }
                            fetchAgendamentos().then(setAgendamentos);
                          }
                          
                          // 3. Baixar insumos do estoque
                          for (const insumo of checkoutInsumos) {
                            if (insumo.qty_used > 0) {
                              await registrarMovimentacao(insumo.inventory_id, 'OUT_PROCEDURE', insumo.qty_used, {
                                appointmentId: checkoutAppt.id,
                                notes: `Procedimento: ${getServicoNome(checkoutAppt.servico_id, servicos)}`,
                              });
                            }
                          }
                          
                          // 3.5. Baixar produtos vendidos (Upsell)
                          for (const prod of checkoutProdutos) {
                            if (prod.qty > 0) {
                              await registrarMovimentacao(prod.inventory_id, 'OUT_SALE', prod.qty, {
                                appointmentId: checkoutAppt.id,
                                notes: `Venda Direta: ${getServicoNome(checkoutAppt.servico_id, servicos)}`,
                              });
                            }
                          }

                          // 4. Gerar comissão para o profissional
                          const totalServicoCom = getServicoPreco(checkoutAppt.servico_id, servicos);
                          const totalExtrasVal = checkoutExtras.reduce((acc, curr) => acc + curr.preco, 0);
                          const totalInsumosCom = checkoutInsumos.reduce((acc, i) => acc + i.custo_total, 0);
                          const totalProdutosCom = checkoutProdutos.reduce((acc, p) => acc + (p.preco * p.qty), 0);
                          const totalGeralCom = totalServicoCom + totalExtrasVal + totalInsumosCom + totalProdutosCom;
                          await criarComissao({
                            appointmentId: checkoutAppt.id,
                            professionalId: checkoutAppt.profissional_id,
                            serviceId: checkoutAppt.servico_id,
                            totalAmount: totalGeralCom,
                            paymentMethod: checkoutPagamento,
                            installments: checkoutPagamento === 'CREDITO' ? checkoutParcelas : 1,
                            appointmentDate: checkoutAppt.data,
                          });
                          
                          setCheckoutAppt(null);
                          setCheckoutExtras([]);
                          setExtraServiceSelect('');
                          setCheckoutInsumos([]);
                          setCheckoutProdutos([]);
                          setCheckoutPagamento('DINHEIRO');
                          setCheckoutParcelas(1);
                          alert('Atendimento concluído! Insumos, produtos e comissão registrados com sucesso.');
                        }}>
                          Confirmar Recebimento
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardGlass>
        </div>
      )}

      {/* Modal de Novo Agendamento Dinâmico (Profissional -> Serviço -> Horários) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/[0.7] backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-lg p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold font-serif text-foreground">Novo Agendamento</h3>
                <p className="text-xs text-foreground/50">Selecione o profissional para filtrar os serviços e horários disponíveis</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-foreground/50 hover:text-foreground">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSalvarAgendamento} className="space-y-4">
              {/* 1. Cliente */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5">1. Cliente *</label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold"
                  value={formData.cliente_id}
                  onChange={e => setFormData(f => ({ ...f, cliente_id: e.target.value }))}
                  required
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.telefone})</option>
                  ))}
                </select>
              </div>

              {/* 2. Profissional PRIMEIRO */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center gap-1.5">
                  <User2 size={14} className="text-gold" />
                  2. Profissional *
                </label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold font-semibold"
                  value={formData.profissional_id}
                  onChange={e => {
                    const profId = e.target.value;
                    setFormData(f => ({ ...f, profissional_id: profId, servico_id: '' }));
                  }}
                  required
                >
                  <option value="">Selecione quem irá atender</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              {/* 3. Serviço FILTRADO pelo Profissional */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center justify-between">
                  <span>3. Serviço *</span>
                  {formData.profissional_id && (
                    <span className="text-[11px] font-normal text-gold font-mono">
                      {servicosDoProfissional.length} serviços disponíveis para este profissional
                    </span>
                  )}
                </label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold disabled:opacity-50"
                  value={formData.servico_id}
                  onChange={e => {
                    const serv = servicos.find(s => s.id === e.target.value);
                    setFormData(f => ({ ...f, servico_id: e.target.value, duracao_min: serv ? String(serv.duracao_min) : '' }));
                  }}
                  disabled={!formData.profissional_id}
                  required
                >
                  <option value="">
                    {!formData.profissional_id 
                      ? '← Selecione o profissional primeiro' 
                      : 'Selecione o procedimento'}
                  </option>
                  {servicosDoProfissional.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — R$ {s.preco} ({s.duracao_min} min)
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Edição de Tempo */}
              {formData.servico_id && (
                <div>
                  <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center justify-between">
                    <span>Tempo Exato (Minutos) *</span>
                    <span className="text-[11px] font-normal text-gold font-mono">Pode ser ajustado</span>
                  </label>
                  <input 
                    type="number"
                    value={formData.duracao_min}
                    onChange={e => setFormData(f => ({ ...f, duracao_min: e.target.value }))}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold font-mono"
                    placeholder="Ex: 45"
                    required
                  />
                </div>
              )}

              {/* Cliente Fixo */}
              <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.is_fixed}
                    onChange={e => setFormData(f => ({ ...f, is_fixed: e.target.checked }))}
                    className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--background)] text-gold focus:ring-gold accent-gold"
                  />
                  <span className="text-sm font-bold text-foreground">Este é um horário fixo/recorrente do cliente?</span>
                </label>
                
                {formData.is_fixed && (
                  <div className="pl-6 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5">Frequência</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setFormData(f => ({ ...f, recurrence_type: 'WEEKLY' }))} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${formData.recurrence_type === 'WEEKLY' ? 'border-gold bg-gold/10 text-gold' : 'border-[var(--border-subtle)] text-foreground/60'}`}>Semanal</button>
                      <button type="button" onClick={() => setFormData(f => ({ ...f, recurrence_type: 'BIWEEKLY' }))} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${formData.recurrence_type === 'BIWEEKLY' ? 'border-gold bg-gold/10 text-gold' : 'border-[var(--border-subtle)] text-foreground/60'}`}>Quinzenal</button>
                      <button type="button" onClick={() => setFormData(f => ({ ...f, recurrence_type: 'MONTHLY' }))} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${formData.recurrence_type === 'MONTHLY' ? 'border-gold bg-gold/10 text-gold' : 'border-[var(--border-subtle)] text-foreground/60'}`}>Mensal</button>
                      <button type="button" onClick={() => setFormData(f => ({ ...f, recurrence_type: 'CUSTOM' }))} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${formData.recurrence_type === 'CUSTOM' ? 'border-gold bg-gold/10 text-gold' : 'border-[var(--border-subtle)] text-foreground/60'}`}>Todo Dia...</button>
                    </div>
                    {formData.recurrence_type === 'CUSTOM' && (
                      <div className="mt-3">
                        <label className="block text-[11px] font-bold text-foreground/70 mb-1">Qual o dia fixo do mês? (1 a 31)</label>
                        <input 
                          type="number"
                          min="1"
                          max="31"
                          required={formData.is_fixed && formData.recurrence_type === 'CUSTOM'}
                          placeholder="Ex: 5"
                          value={formData.recurrence_custom_day}
                          onChange={e => setFormData(f => ({ ...f, recurrence_custom_day: e.target.value }))}
                          className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-sm text-foreground focus:outline-none focus:border-gold"
                        />
                      </div>
                    )}
                    <p className="text-[11px] text-foreground/50 mt-2">O sistema irá marcar este agendamento como fixo para o cliente.</p>
                  </div>
                )}
              </div>

              {/* Permitir sobreposição (Encaixe) */}
              <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.allow_overlap}
                    onChange={e => setFormData(f => ({ ...f, allow_overlap: e.target.checked }))}
                    className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--background)] text-gold focus:ring-gold accent-gold"
                  />
                  <span className="text-sm font-bold text-foreground">Permitir sobreposição (Encaixe/Pausa)</span>
                </label>
                <p className="text-[11px] text-foreground/50 ml-6">Marque caso este atendimento ocorra no mesmo horário de outro já existente na agenda do profissional.</p>
              </div>

              {/* 4. Data & Horário Inteligente */}
              <div className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center gap-1">
                      <CalendarDays size={14} className="text-gold" />
                      4. Data do Atendimento *
                    </label>
                    <input 
                      type="date"
                      value={formData.data}
                      onChange={e => setFormData(f => ({ ...f, data: e.target.value }))}
                      onClick={(e) => {
                        if (typeof (e.target as any).showPicker === 'function') {
                          (e.target as any).showPicker();
                        }
                      }}
                      min={hoje}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold cursor-pointer"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center gap-1">
                      <Clock size={14} className="text-gold" />
                      5. Horário Disponível *
                    </label>
                    
                    {horariosDisponiveis.length > 0 ? (
                      <select
                        value={formData.hora_inicio}
                        onChange={e => setFormData(f => ({ ...f, hora_inicio: e.target.value }))}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold font-mono"
                        required
                      >
                        {horariosDisponiveis.map(slot => (
                          <option key={slot.hora} value={slot.hora} disabled={slot.ocupado}>
                            {slot.hora} {slot.ocupado ? '(Ocupado)' : '— Livre'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="time"
                        value={formData.hora_inicio}
                        onChange={e => setFormData(f => ({ ...f, hora_inicio: e.target.value }))}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold [color-scheme:dark]"
                        required
                      />
                    )}
                  </div>
                </div>

                {/* Status do Salão vs Profissional */}
                {statusDiaInfo && (
                  <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    statusDiaInfo.tipo === 'aberto' 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {statusDiaInfo.tipo === 'aberto' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <span>{statusDiaInfo.texto}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" className="font-bold">
                  Salvar Agendamento
                </Button>
              </div>
            </form>
          </CardGlass>
        </div>
      )}
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-foreground/50">Carregando agenda...</div>}>
      <AgendaContent />
    </Suspense>
  );
}
