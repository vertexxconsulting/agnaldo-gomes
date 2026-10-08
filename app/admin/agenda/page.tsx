'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ViewToggle } from '@/components/ViewToggle';
import { fetchAgendamentos, fetchProfissionais, fetchBloqueios, fetchClientes, fetchServicos, fetchProfissionalServico, fetchEstoque, fetchTodosServicoProdutos, registrarMovimentacao, criarComissao, fetchItensComanda, fetchTaxasPagamento, calcularTaxaMaquininha } from '@/lib/supabase-queries';
import {
  STATUS_LABELS, STATUS_COLORS, getServicoDuracao, getServicoPreco,
  getClienteNome, getServicoNome, getProfissionalNome
} from '@/lib/mock-data';
import type { Agendamento, BloqueioAgenda, StatusAgendamento, Cliente, Servico, ProfissionalServico, ProdutoEstoque, ServicoProduto, InsumoAtendimento, FormaPagamento, PaymentFee } from '@/lib/gestao-types';
import type { Profissional } from '@/lib/gestao-types';
import { CalendarDays, Clock, User2, Check, X, CheckCircle2, AlertCircle, AlertTriangle, Sparkles, Beaker, CreditCard, Banknote, Smartphone, ShoppingBag, Search, UserPlus, Phone, Percent, Tag } from 'lucide-react';
import { obterHorariosSalao, DEFAULT_HORARIOS_SALAO } from '@/lib/ia-config';

function formatPhone(val: string) {
  if (!val) return '';
  const clean = val.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return val;
}

const DIAS_CHAVE = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export function getCategoriaProfissional(p: Profissional): 'Cabelo' | 'Unhas' | string {
  if (p.categoria) {
    const catNorm = p.categoria.trim().toLowerCase();
    if (catNorm.includes('unha') || catNorm.includes('manicure') || catNorm.includes('pedic')) return 'Unhas';
    if (catNorm.includes('cabelo') || catNorm.includes('capilar')) return 'Cabelo';
    return p.categoria;
  }
  // Fallback por especialidades se a coluna ainda não estiver populada
  if (p.especialidades && p.especialidades.length > 0) {
    const tags = p.especialidades.map(e => e.toLowerCase()).join(' ');
    if (tags.includes('unha') || tags.includes('manicure') || tags.includes('pedicure') || tags.includes('esmalte') || tags.includes('podolog')) {
      return 'Unhas';
    }
  }
  // Fallback por nome
  const nomeLower = (p.nome || '').toLowerCase();
  if (nomeLower.includes('unha') || nomeLower.includes('manicure') || nomeLower.includes('camila')) {
    return 'Unhas';
  }
  return 'Cabelo';
}

function AgendaContent() {
  const searchParams = useSearchParams();
  const hoje = new Date().toISOString().split('T')[0];
  const [dataSelecionada, setDataSelecionada] = useState(searchParams.get('date') || hoje);
  const [profFiltro, setProfFiltro] = useState<string>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'todas' | 'Cabelo' | 'Unhas' | string>('todas');
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
  const [checkoutProdutos, setCheckoutProdutos] = useState<Array<{ 
    id: string; 
    inventory_id: string; 
    qty: number; 
    precoOriginal: number;
    preco: number; 
    descontoPct?: number; 
    descontoValor?: number; 
  }>>([]);
  // Pagamento e comissão
  const [checkoutPagamento, setCheckoutPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [checkoutParcelas, setCheckoutParcelas] = useState<number>(1);
  const [taxasPagamento, setTaxasPagamento] = useState<PaymentFee[]>([]);

  // Desconto no Atendimento (com ajuste sincronizado entre % e R$)
  const [checkoutDescontoPct, setCheckoutDescontoPct] = useState<string>('');
  const [checkoutDescontoValor, setCheckoutDescontoValor] = useState<string>('');
  const [checkoutDescontoMotivo, setCheckoutDescontoMotivo] = useState<string>('');

  // Adicionar Produto de Salão no Checkout
  const [checkoutNovoProdId, setCheckoutNovoProdId] = useState<string>('');
  const [checkoutNovoProdQty, setCheckoutNovoProdQty] = useState<string>('1');
  const [checkoutNovoProdDescPct, setCheckoutNovoProdDescPct] = useState<string>('');
  const [checkoutNovoProdDescValor, setCheckoutNovoProdDescValor] = useState<string>('');

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

  // Busca e filtro de clientes no modal de agendamento
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false);
  const [cadastrandoNovoCliente, setCadastrandoNovoCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');
  const [salvandoNovoCliente, setSalvandoNovoCliente] = useState(false);
  const clienteSearchContainerRef = useRef<HTMLDivElement>(null);

  // Busca de cliente na visualização da Agenda
  const [buscaClienteAgenda, setBuscaClienteAgenda] = useState('');

  // Fechar dropdown de clientes ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clienteSearchContainerRef.current && !clienteSearchContainerRef.current.contains(event.target as Node)) {
        setClienteDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clienteSelecionado = useMemo(() => {
    return clientes.find(c => c.id === formData.cliente_id) || null;
  }, [clientes, formData.cliente_id]);

  const clientesFiltradosModal = useMemo(() => {
    const termo = buscaCliente.toLowerCase().trim();
    const termoApenasDigitos = termo.replace(/\D/g, '');

    if (!termo) {
      return [...clientes].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).slice(0, 20);
    }

    return clientes
      .filter(c => {
        const nomeMatch = (c.nome || '').toLowerCase().includes(termo);
        const emailMatch = (c.email || '').toLowerCase().includes(termo);
        const foneMatch = termoApenasDigitos
          ? (c.telefone || '').replace(/\D/g, '').includes(termoApenasDigitos)
          : (c.telefone || '').includes(termo);
        const codigoMatch = c.codigo ? String(c.codigo).includes(termo) : false;
        return nomeMatch || emailMatch || foneMatch || codigoMatch;
      })
      .sort((a, b) => {
        const aStarts = (a.nome || '').toLowerCase().startsWith(termo);
        const bStarts = (b.nome || '').toLowerCase().startsWith(termo);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (a.nome || '').localeCompare(b.nome || '');
      })
      .slice(0, 30);
  }, [clientes, buscaCliente]);

  const handleSalvarNovoClienteRapido = async () => {
    const nome = novoClienteNome.trim();
    const telefone = novoClienteTelefone.trim();
    if (!nome || !telefone) {
      alert('Nome e Telefone são obrigatórios.');
      return;
    }

    setSalvandoNovoCliente(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, telefone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar cliente');

      const savedCliente: Cliente = data.cliente ? {
        id: data.cliente.id,
        codigo: data.cliente.codigo,
        nome: data.cliente.nome || data.cliente.name || nome,
        telefone: data.cliente.telefone || data.cliente.phone || telefone,
        email: data.cliente.email,
        cpf: data.cliente.cpf,
        endereco: data.cliente.endereco || data.cliente.address,
        nascimento: data.cliente.nascimento || data.cliente.birth_date,
        observacoes: data.cliente.observacoes || data.cliente.notes,
        criado_em: data.cliente.created_at || new Date().toISOString(),
      } : {
        id: `c_${Date.now()}`,
        nome,
        telefone,
        criado_em: new Date().toISOString(),
      };

      setClientes(prev => [savedCliente, ...prev]);
      setFormData(f => ({ ...f, cliente_id: savedCliente.id }));
      setCadastrandoNovoCliente(false);
      setNovoClienteNome('');
      setNovoClienteTelefone('');
      setBuscaCliente('');
      setClienteDropdownAberto(false);
    } catch (err: any) {
      console.error('Erro ao cadastrar cliente rápido:', err);
      alert(`Erro ao cadastrar cliente: ${err.message}`);
    } finally {
      setSalvandoNovoCliente(false);
    }
  };

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
      // Carrega estoque, vínculos serviço-produto e taxas de pagamento
      const [estoqueData, spData, taxasData] = await Promise.all([
        fetchEstoque(true),
        fetchTodosServicoProdutos(),
        fetchTaxasPagamento()
      ]);
      setEstoque(estoqueData);
      setServicoProdutos(spData);
      setTaxasPagamento(taxasData.taxas);
      setLoading(false);
    };
    carregarDados();
  }, [dataSelecionada]);

  // Contagem de profissionais por categoria
  const countPorCategoria = useMemo(() => {
    const counts: { todas: number; Cabelo: number; Unhas: number; [key: string]: number } = {
      todas: profissionais.length,
      Cabelo: 0,
      Unhas: 0
    };
    for (const p of profissionais) {
      const cat = getCategoriaProfissional(p);
      if (cat === 'Unhas') {
        counts.Unhas = (counts.Unhas || 0) + 1;
      } else if (cat === 'Cabelo') {
        counts.Cabelo = (counts.Cabelo || 0) + 1;
      } else {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    return counts;
  }, [profissionais]);

  // Profissionais filtrados pela categoria selecionada (ou todas)
  const profissionaisFiltradosPorCategoria = useMemo(() => {
    if (categoriaFiltro === 'todas') return profissionais;
    return profissionais.filter(p => getCategoriaProfissional(p) === categoriaFiltro);
  }, [profissionais, categoriaFiltro]);

  // Troca de categoria com auto-reset do filtro de profissional se não pertencer à nova categoria
  const handleCategoriaChange = (cat: string) => {
    setCategoriaFiltro(cat);
    if (profFiltro !== 'todos') {
      const prof = profissionais.find(p => p.id === profFiltro);
      if (prof && cat !== 'todas' && getCategoriaProfissional(prof) !== cat) {
        setProfFiltro('todos');
      }
    }
  };

  // Profissionais visíveis na agenda (colunas do Kanban)
  const profissionaisVisiveisNaAgenda = useMemo(() => {
    return profissionaisFiltradosPorCategoria.filter(p => profFiltro === 'todos' || p.id === profFiltro);
  }, [profissionaisFiltradosPorCategoria, profFiltro]);

  const idsVisiveis = useMemo(() => new Set(profissionaisVisiveisNaAgenda.map(p => p.id)), [profissionaisVisiveisNaAgenda]);

  // Filtro por data e profissional na visualização respeitando a categoria ativa
  const doDia = agendamentos.filter(a => a.data === dataSelecionada);
  let agendamentosFiltrados = doDia.filter(a => idsVisiveis.has(a.profissional_id));

  if (buscaClienteAgenda.trim()) {
    const termo = buscaClienteAgenda.toLowerCase().trim();
    const digitos = termo.replace(/\D/g, '');
    agendamentosFiltrados = agendamentosFiltrados.filter(a => {
      const c = clientes.find(cli => cli.id === a.cliente_id);
      if (!c) return false;
      const nomeMatch = (c.nome || '').toLowerCase().includes(termo);
      const foneMatch = digitos ? (c.telefone || '').replace(/\D/g, '').includes(digitos) : (c.telefone || '').includes(termo);
      const codMatch = c.codigo ? String(c.codigo).includes(termo) : false;
      return nomeMatch || foneMatch || codMatch;
    });
  }

  agendamentosFiltrados.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const bloqueiosFiltrados = bloqueiosDia.filter(b => {
    const matchProf = idsVisiveis.has(b.profissional_id);
    const matchData = b.data_inicio.slice(0, 10) === dataSelecionada || b.data_fim.slice(0, 10) === dataSelecionada;
    return matchProf && matchData;
  });

  // Serviços filtrados pelo profissional selecionado no formulário
  const servicosDoProfissional = useMemo(() => {
    if (!formData.profissional_id) return [];
    const idsVinculados = profServicos
      .filter(ps => ps.profissional_id === formData.profissional_id)
      .map(ps => ps.servico_id);
    
    // Retorna EXCLUSIVAMENTE os procedimentos vinculados ao profissional (sem fallback geral)
    if (idsVinculados.length > 0) {
      return servicos.filter(s => s.ativo && idsVinculados.includes(s.id));
    }
    return [];
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
    setCheckoutDescontoPct('');
    setCheckoutDescontoValor('');
    setCheckoutDescontoMotivo('');
    setCheckoutNovoProdId('');
    setCheckoutNovoProdQty('1');
    setCheckoutNovoProdDescPct('');
    setCheckoutNovoProdDescValor('');

    const itens = await fetchItensComanda(appt.id);
    
    // Insumos
    const insumosDaComanda = itens.filter(i => i.type === 'INSUMO');
    const mapInsumos: InsumoAtendimento[] = insumosDaComanda.map(i => {
      const prod = estoque.find(p => p.id === i.inventory_id);
      const custoUn = prod?.cost_price || 0;
      return {
        inventory_id: i.inventory_id,
        name: prod?.name || 'Insumo',
        unit: prod?.unit || 'g',
        price_per_gram: prod?.cost_price || 0,
        qty_used: i.qty,
        custo_unitario: custoUn,
        custo_total: custoUn * i.qty
      };
    });
    setCheckoutInsumos(mapInsumos);

    // Produtos (Upsell)
    const produtosDaComanda = itens.filter(i => i.type === 'PRODUTO');
    const mapProdutos = produtosDaComanda.map(i => {
      const prod = estoque.find(p => p.id === i.inventory_id);
      const precoBase = i.price > 0 ? i.price : (prod?.sale_price || 0);
      return {
        id: Date.now().toString() + i.id, // Random id for list
        inventory_id: i.inventory_id,
        qty: i.qty,
        precoOriginal: precoBase,
        preco: precoBase,
        descontoPct: 0,
        descontoValor: 0,
      };
    });
    setCheckoutProdutos(mapProdutos);
  };

  const fecharCheckout = () => {
    setCheckoutAppt(null);
    setCheckoutExtras([]);
    setExtraServiceSelect('');
    setCheckoutInsumos([]);
    setCheckoutProdutos([]);
    setCheckoutPagamento('DINHEIRO');
    setCheckoutParcelas(1);
    setCheckoutDescontoPct('');
    setCheckoutDescontoValor('');
    setCheckoutDescontoMotivo('');
    setCheckoutNovoProdId('');
    setCheckoutNovoProdQty('1');
    setCheckoutNovoProdDescPct('');
    setCheckoutNovoProdDescValor('');
  };

  // Funções de Desconto no Atendimento (com auto-ajuste sincronizado % <-> R$)
  const handleCheckoutDescontoPct = (pctStr: string, subtotal: number) => {
    setCheckoutDescontoPct(pctStr);
    const p = parseFloat(pctStr);
    if (isNaN(p) || p <= 0) {
      setCheckoutDescontoValor('');
    } else {
      const clamped = Math.min(100, Math.max(0, p));
      const val = (subtotal * clamped) / 100;
      setCheckoutDescontoValor(val.toFixed(2));
    }
  };

  const handleCheckoutDescontoValor = (valStr: string, subtotal: number) => {
    setCheckoutDescontoValor(valStr);
    const v = parseFloat(valStr);
    if (isNaN(v) || v <= 0 || subtotal <= 0) {
      setCheckoutDescontoPct('');
    } else {
      const clampedVal = Math.min(subtotal, Math.max(0, v));
      const p = (clampedVal / subtotal) * 100;
      setCheckoutDescontoPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
    }
  };

  // Funções de Desconto para Produto adicionado no Checkout (com auto-ajuste sincronizado % <-> R$)
  const handleCheckoutNovoProdDescPct = (pctStr: string) => {
    setCheckoutNovoProdDescPct(pctStr);
    const prod = estoque.find(e => e.id === checkoutNovoProdId);
    const sub = (prod?.sale_price || 0) * (Math.max(1, parseInt(checkoutNovoProdQty) || 1));
    const p = parseFloat(pctStr);
    if (isNaN(p) || p <= 0) {
      setCheckoutNovoProdDescValor('');
    } else {
      const clamped = Math.min(100, Math.max(0, p));
      const val = (sub * clamped) / 100;
      setCheckoutNovoProdDescValor(val.toFixed(2));
    }
  };

  const handleCheckoutNovoProdDescValor = (valStr: string) => {
    setCheckoutNovoProdDescValor(valStr);
    const prod = estoque.find(e => e.id === checkoutNovoProdId);
    const sub = (prod?.sale_price || 0) * (Math.max(1, parseInt(checkoutNovoProdQty) || 1));
    const v = parseFloat(valStr);
    if (isNaN(v) || v <= 0 || sub <= 0) {
      setCheckoutNovoProdDescPct('');
    } else {
      const clamped = Math.min(sub, Math.max(0, v));
      const p = (clamped / sub) * 100;
      setCheckoutNovoProdDescPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
    }
  };

  const adicionarProdutoAoCheckout = () => {
    if (!checkoutNovoProdId) return;
    const prod = estoque.find(e => e.id === checkoutNovoProdId);
    if (!prod) return;
    const q = Math.max(1, parseInt(checkoutNovoProdQty) || 1);
    const precoOriginal = prod.sale_price || 0;
    const subtotalItem = precoOriginal * q;
    const descVal = Math.min(subtotalItem, Math.max(0, parseFloat(checkoutNovoProdDescValor) || 0));
    const descPct = parseFloat(checkoutNovoProdDescPct) || (subtotalItem > 0 ? (descVal / subtotalItem) * 100 : 0);
    const precoUnitFinal = (subtotalItem - descVal) / q;

    setCheckoutProdutos(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        inventory_id: prod.id,
        qty: q,
        precoOriginal,
        preco: precoUnitFinal,
        descontoPct: descPct,
        descontoValor: descVal,
      }
    ]);

    setCheckoutNovoProdId('');
    setCheckoutNovoProdQty('1');
    setCheckoutNovoProdDescPct('');
    setCheckoutNovoProdDescValor('');
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
    setBuscaCliente(buscaClienteAgenda || '');
    setClienteDropdownAberto(Boolean(buscaClienteAgenda));
    setCadastrandoNovoCliente(false);
    setShowForm(true);
  };

  const handleSalvarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id) {
      alert('Por favor, busque e selecione um cliente para o agendamento.');
      return;
    }
    if (!formData.profissional_id || !formData.servico_id || !formData.data || !formData.hora_inicio) {
      alert('Preencha todos os campos obrigatórios (Profissional, Serviço, Data e Horário).');
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
      setBuscaCliente('');
      setClienteDropdownAberto(false);
      setCadastrandoNovoCliente(false);
    } catch (err: any) {
      console.error('Erro ao salvar agendamento:', err);
      alert(`Erro ao salvar no banco: ${err.message}`);
    }
  };

  return (
    <div className="py-4">
      <SectionTitle title="Agenda do Salão" subtitle="Gerenciamento de horários e profissionais" align="left" />

      {/* Filtro por Categoria de Profissional (Cabelo / Unhas) e Profissionais */}
      <div className="mt-8 mb-4 space-y-3">
        {/* Seletor de Categoria */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground/50 mr-1 flex items-center gap-1">
            <Sparkles size={13} className="text-gold" /> Categoria:
          </span>
          <div className="inline-flex p-1 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl gap-1 shadow-sm">
            <button
              onClick={() => handleCategoriaChange('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoriaFiltro === 'todas'
                  ? 'bg-gold text-background shadow'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
              }`}
            >
              <span>Todos os Atendimentos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                categoriaFiltro === 'todas' ? 'bg-black/20 text-background' : 'bg-foreground/10 text-foreground/60'
              }`}>
                {countPorCategoria.todas || 0}
              </span>
            </button>
            <button
              onClick={() => handleCategoriaChange('Cabelo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoriaFiltro === 'Cabelo'
                  ? 'bg-gold text-background shadow'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
              }`}
            >
              <span>✂️ Cabelo</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                categoriaFiltro === 'Cabelo' ? 'bg-black/20 text-background' : 'bg-foreground/10 text-foreground/60'
              }`}>
                {countPorCategoria.Cabelo || 0}
              </span>
            </button>
            <button
              onClick={() => handleCategoriaChange('Unhas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoriaFiltro === 'Unhas'
                  ? 'bg-gold text-background shadow'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
              }`}
            >
              <span>💅 Unhas</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                categoriaFiltro === 'Unhas' ? 'bg-black/20 text-background' : 'bg-foreground/10 text-foreground/60'
              }`}>
                {countPorCategoria.Unhas || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Filtro Profissionais (Cards) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
          <button
            onClick={() => setProfFiltro('todos')}
            className={`shrink-0 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
              profFiltro === 'todos' 
                ? 'bg-gold border-gold text-background shadow-md' 
                : 'bg-[var(--color-card)] border-[var(--border-subtle)] text-foreground/70 hover:border-gold/50 hover:bg-white/5'
            }`}
          >
            {categoriaFiltro === 'todas' ? 'Todos os Profissionais' : `Todos (${categoriaFiltro})`}
            <span className="ml-1.5 text-xs opacity-80 font-mono">({profissionaisFiltradosPorCategoria.length})</span>
          </button>
          {profissionaisFiltradosPorCategoria.map(p => {
            const cat = getCategoriaProfissional(p);
            return (
              <button
                key={p.id}
                onClick={() => setProfFiltro(p.id)}
                className={`shrink-0 px-4 py-2 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 ${
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
                <span>{p.nome}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  profFiltro === p.id ? 'bg-black/20 text-background' : 'bg-foreground/10 text-foreground/60'
                }`}>
                  {cat === 'Unhas' ? '💅 Unhas' : '✂️ Cabelo'}
                </span>
              </button>
            );
          })}
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

        {/* Busca rápida por cliente na agenda */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            value={buscaClienteAgenda}
            onChange={e => setBuscaClienteAgenda(e.target.value)}
            placeholder="Buscar cliente na agenda..."
            className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] focus:border-gold rounded-lg pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none transition-colors shadow-sm"
          />
          {buscaClienteAgenda && (
            <button
              onClick={() => setBuscaClienteAgenda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-0.5"
              title="Limpar filtro"
            >
              <X size={14} />
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
          <Button 
            variant="primary" 
            onClick={() => {
              setBuscaCliente(buscaClienteAgenda || '');
              setClienteDropdownAberto(Boolean(buscaClienteAgenda));
              setCadastrandoNovoCliente(false);
              setShowForm(true);
            }}
          >
            + Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Indicador de filtro ativo por cliente */}
      {buscaClienteAgenda.trim() && (
        <div className="mb-4 px-3.5 py-2.5 bg-gold/10 border border-gold/30 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-foreground">
            <Search size={14} className="text-gold shrink-0" />
            <span>
              Filtrando agenda por cliente: <strong className="text-gold">"{buscaClienteAgenda}"</strong>{' '}
              <span className="text-foreground/60 font-mono">
                ({agendamentosFiltrados.length} {agendamentosFiltrados.length === 1 ? 'horário encontrado' : 'horários encontrados'})
              </span>
            </span>
          </div>
          <button
            onClick={() => setBuscaClienteAgenda('')}
            className="text-xs font-bold text-gold hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            <X size={13} /> Limpar
          </button>
        </div>
      )}

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
            {profissionaisVisiveisNaAgenda.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-[var(--border-subtle)] rounded-xl bg-[var(--color-card)] text-foreground/60">
                <p className="text-base font-semibold">Nenhum profissional encontrado na categoria "{categoriaFiltro}".</p>
                <p className="text-xs text-foreground/40 mt-1">Selecione "Todos os Atendimentos" ou cadastre um novo profissional na aba Profissionais.</p>
                <button
                  onClick={() => { setCategoriaFiltro('todas'); setProfFiltro('todos'); }}
                  className="mt-4 px-4 py-2 bg-gold/15 text-gold hover:bg-gold hover:text-background font-bold text-xs rounded-lg transition-colors inline-block"
                >
                  Ver todos os profissionais
                </button>
              </div>
            ) : (
            <div className="flex border border-[var(--border-subtle)] rounded-xl bg-[var(--color-card)] overflow-hidden shadow-sm min-h-[600px] w-max min-w-full">
              {profissionaisVisiveisNaAgenda.map(prof => {
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-foreground text-sm uppercase tracking-wide leading-tight">{prof.nome}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/15 text-gold font-bold">
                            {getCategoriaProfissional(prof) === 'Unhas' ? '💅 Unhas' : '✂️ Cabelo'}
                          </span>
                        </div>
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
            )}
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
              <button onClick={fecharCheckout} className="text-foreground/50 hover:text-foreground">
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

              {/* PRODUTOS DO SALÃO (Venda / Upsell / Balcão) */}
              <div className="p-4 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShoppingBag size={16} className="text-gold" />
                    Produtos do Salão (Venda / Balcão)
                  </h4>
                  {checkoutProdutos.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold font-semibold">
                      {checkoutProdutos.length} {checkoutProdutos.length === 1 ? 'item' : 'itens'}
                    </span>
                  )}
                </div>

                {/* Lista de Produtos Adicionados */}
                {checkoutProdutos.length > 0 && (
                  <div className="space-y-2">
                    {checkoutProdutos.map((prod, idx) => {
                      const itemEstoque = estoque.find(e => e.id === prod.inventory_id);
                      const subOriginal = (prod.precoOriginal ?? prod.preco) * prod.qty;
                      const subFinal = prod.preco * prod.qty;
                      const temDesc = (prod.descontoValor != null && prod.descontoValor > 0) || subOriginal > subFinal;

                      return (
                        <div key={prod.id} className="flex justify-between items-center p-3 bg-gold/5 border border-gold/15 rounded-lg text-sm">
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground truncate">{itemEstoque?.name || 'Produto'}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gold/15 text-gold font-mono">{prod.qty}x</span>
                            </div>
                            {temDesc ? (
                              <p className="text-xs text-foreground/50 mt-0.5 flex items-center gap-1.5">
                                <span className="line-through">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subOriginal)}</span>
                                <span className="text-emerald-400 font-semibold">
                                  Desc: {prod.descontoPct ? `${prod.descontoPct.toFixed(0)}%` : ''} (-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subOriginal - subFinal)})
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs text-foreground/40 mt-0.5">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.preco)} un.
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-gold font-mono">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subFinal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCheckoutProdutos(checkoutProdutos.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors"
                              title="Remover produto"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Adicionar Produto no Checkout */}
                <div className="p-3 bg-foreground/[0.02] border border-[var(--border-subtle)] rounded-lg space-y-2.5">
                  <p className="text-xs font-semibold text-foreground/70">Adicionar produto ao atendimento:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-8">
                      <select
                        value={checkoutNovoProdId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          setCheckoutNovoProdId(pid);
                          if (checkoutNovoProdDescPct) {
                            const p = estoque.find(x => x.id === pid);
                            const sub = (p?.sale_price || 0) * (Math.max(1, parseInt(checkoutNovoProdQty) || 1));
                            const pct = parseFloat(checkoutNovoProdDescPct) || 0;
                            const val = (sub * pct) / 100;
                            setCheckoutNovoProdDescValor(val > 0 ? val.toFixed(2) : '');
                          }
                        }}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                      >
                        <option value="">Selecione o produto...</option>
                        {estoque.filter(p => p.allow_sale && p.active).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.sale_price || 0)} ({p.stock_qty} em estoque)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-foreground/50 whitespace-nowrap">Qtd:</span>
                        <input
                          type="number"
                          min="1"
                          value={checkoutNovoProdQty}
                          onChange={(e) => {
                            const q = e.target.value;
                            setCheckoutNovoProdQty(q);
                            if (checkoutNovoProdDescPct) {
                              const p = estoque.find(x => x.id === checkoutNovoProdId);
                              const sub = (p?.sale_price || 0) * (Math.max(1, parseInt(q) || 1));
                              const pct = parseFloat(checkoutNovoProdDescPct) || 0;
                              const val = (sub * pct) / 100;
                              setCheckoutNovoProdDescValor(val > 0 ? val.toFixed(2) : '');
                            }
                          }}
                          className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-center focus:outline-none focus:border-gold font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campos de Desconto do Produto adicionado */}
                  {checkoutNovoProdId && (() => {
                    const prodSel = estoque.find(p => p.id === checkoutNovoProdId);
                    const qSel = Math.max(1, parseInt(checkoutNovoProdQty) || 1);
                    const subItem = (prodSel?.sale_price || 0) * qSel;
                    const descValItem = Math.min(subItem, Math.max(0, parseFloat(checkoutNovoProdDescValor) || 0));
                    const totalItemFinal = Math.max(0, subItem - descValItem);

                    return (
                      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-foreground/50 block mb-1">Desc. no Produto (%)</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                placeholder="0"
                                value={checkoutNovoProdDescPct}
                                onChange={(e) => handleCheckoutNovoProdDescPct(e.target.value)}
                                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-1.5 pl-2 pr-6 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 text-[10px] font-bold">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-foreground/50 block mb-1">Desc. no Produto (R$)</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground/40 text-[10px] font-bold">R$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder="0.00"
                                value={checkoutNovoProdDescValor}
                                onChange={(e) => handleCheckoutNovoProdDescValor(e.target.value)}
                                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-1.5 pl-7 pr-2 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1">
                          <span className="text-foreground/60">
                            Total do item: <strong className="text-foreground font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalItemFinal)}</strong>
                            {descValItem > 0 && <span className="text-emerald-400 ml-1.5 font-medium">(-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(descValItem)})</span>}
                          </span>
                          <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            onClick={adicionarProdutoAoCheckout}
                            className="text-xs py-1 px-3"
                          >
                            <ShoppingBag size={12} className="mr-1" /> Adicionar
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

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

              {/* TOTAL + DESCONTO GERAL + COMISSÃO */}
              {(() => {
                const totalServico = getServicoPreco(checkoutAppt.servico_id, servicos);
                const totalExtras = checkoutExtras.reduce((acc, curr) => acc + curr.preco, 0);
                const totalInsumos = checkoutInsumos.reduce((acc, i) => acc + i.custo_total, 0);
                const totalProdutos = checkoutProdutos.reduce((acc, p) => acc + (p.preco * p.qty), 0);
                const subtotalGeral = totalServico + totalExtras + totalInsumos + totalProdutos;
                
                const valorDesconto = Math.min(subtotalGeral, Math.max(0, parseFloat(checkoutDescontoValor) || 0));
                const totalGeral = Math.max(0, subtotalGeral - valorDesconto);
                const numParcelas = checkoutPagamento === 'CREDITO' ? checkoutParcelas : 1;

                return (
                  <div className="border-t border-[var(--border-subtle)] pt-4 space-y-4">
                    {/* DESCONTO AO CLIENTE (COM AUTO-AJUSTE ENTRE % E R$) */}
                    <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Percent size={16} className="text-emerald-400" />
                          <span className="text-sm font-bold text-foreground">Desconto ao Cliente</span>
                        </div>
                        {valorDesconto > 0 && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold font-mono">
                            -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDesconto)} ({checkoutDescontoPct || '0'}%)
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-foreground/60 mb-1 block">Porcentagem (%)</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              placeholder="Ex: 10"
                              value={checkoutDescontoPct}
                              onChange={(e) => handleCheckoutDescontoPct(e.target.value, subtotalGeral)}
                              className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-3 pr-8 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 text-xs font-bold">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-foreground/60 mb-1 block">Valor em Reais (R$)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 text-xs font-bold">R$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="Ex: 25.00"
                              value={checkoutDescontoValor}
                              onChange={(e) => handleCheckoutDescontoValor(e.target.value, subtotalGeral)}
                              className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Botões de Atalho de Desconto */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-foreground/40 mr-1">Atalhos:</span>
                        {[
                          { label: 'Sem desc.', pct: '0' },
                          { label: '5%', pct: '5' },
                          { label: '10%', pct: '10' },
                          { label: '15%', pct: '15' },
                          { label: '20%', pct: '20' },
                          { label: '25%', pct: '25' },
                          { label: '30%', pct: '30' },
                        ].map(btn => (
                          <button
                            key={btn.pct}
                            type="button"
                            onClick={() => handleCheckoutDescontoPct(btn.pct === '0' ? '' : btn.pct, subtotalGeral)}
                            className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                              (btn.pct === '0' && !checkoutDescontoPct) || (checkoutDescontoPct === btn.pct)
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold'
                                : 'border-[var(--border-subtle)] text-foreground/60 hover:border-emerald-500/30 hover:text-foreground'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Motivo / observação do desconto (opcional, ex: Aniversariante, Cortesia...)"
                          value={checkoutDescontoMotivo}
                          onChange={(e) => setCheckoutDescontoMotivo(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Breakdown Financeiro */}
                    <div className="space-y-1 text-sm bg-foreground/[0.02] p-3 rounded-lg border border-[var(--border-subtle)]">
                      <div className="flex justify-between text-foreground/60">
                        <span>Serviço Agendado</span>
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalServico)}</span>
                      </div>
                      {totalExtras > 0 && (
                        <div className="flex justify-between text-foreground/60">
                          <span>Serviços Extras</span>
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExtras)}</span>
                        </div>
                      )}
                      {totalInsumos > 0 && (
                        <div className="flex justify-between text-amber-400">
                          <span>Insumos (Pesagem)</span>
                          <span>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInsumos)}</span>
                        </div>
                      )}
                      {totalProdutos > 0 && (
                        <div className="flex justify-between text-gold">
                          <span>Produtos de Salão</span>
                          <span>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProdutos)}</span>
                        </div>
                      )}
                      {valorDesconto > 0 && (
                        <div className="flex justify-between text-foreground/50 pt-1 border-t border-[var(--border-subtle)]">
                          <span>Subtotal</span>
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotalGeral)}</span>
                        </div>
                      )}
                      {valorDesconto > 0 && (
                        <div className="flex justify-between text-emerald-400 font-semibold">
                          <span>Desconto ao Cliente ({checkoutDescontoPct || '0'}%)</span>
                          <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDesconto)}</span>
                        </div>
                      )}
                      {(() => {
                        const taxaMaq = calcularTaxaMaquininha(checkoutPagamento, numParcelas, totalGeral, taxasPagamento);
                        if (taxaMaq.valorTaxa <= 0) return null;
                        return (
                          <>
                            <div className="flex justify-between text-amber-400 text-xs font-semibold pt-1 border-t border-[var(--border-subtle)]">
                              <span>Taxa Maquininha ({taxaMaq.regraNome} {taxaMaq.feePercentage}%)</span>
                              <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxaMaq.valorTaxa)}</span>
                            </div>
                            <div className="flex justify-between text-blue-400 text-xs font-bold">
                              <span>Líquido Real da Venda (Salão)</span>
                              <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxaMaq.valorLiquido)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 pt-2">
                      <div>
                        <p className="text-sm text-foreground/60 mb-0.5">Total Líquido a Receber</p>
                        <p className="text-3xl font-bold font-serif text-gold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}
                        </p>
                        {numParcelas > 1 && (
                          <p className="text-xs text-amber-400 mt-0.5">
                            {numParcelas}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral / numParcelas)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="ghost" className="flex-1 sm:flex-none" onClick={fecharCheckout}>
                          Cancelar
                        </Button>
                        <Button variant="primary" className="flex-1 sm:flex-none" onClick={async () => {
                          const taxaMaq = calcularTaxaMaquininha(checkoutPagamento, numParcelas, totalGeral, taxasPagamento);
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
                          
                          // 3.5. Baixar produtos vendidos (Upsell / Salão)
                          for (const prod of checkoutProdutos) {
                            if (prod.qty > 0) {
                              const descNote = prod.descontoValor && prod.descontoValor > 0 
                                ? ` (Desc: -${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.descontoValor)})` 
                                : '';
                              await registrarMovimentacao(prod.inventory_id, 'OUT_SALE', prod.qty, {
                                appointmentId: checkoutAppt.id,
                                notes: `Venda Salão: ${getServicoNome(checkoutAppt.servico_id, servicos)}${descNote}`,
                              });
                            }
                          }

                          // 4. Gerar comissão para o profissional (com o valor líquido recebido pós-desconto e pós-taxa de cartão)
                          const descDetalhes = valorDesconto > 0 
                            ? ` [Desc Geral: -${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDesconto)} (${checkoutDescontoPct}%)${checkoutDescontoMotivo ? ` - ${checkoutDescontoMotivo}` : ''}]` 
                            : '';
                          
                          await criarComissao({
                            appointmentId: checkoutAppt.id,
                            professionalId: checkoutAppt.profissional_id,
                            serviceId: checkoutAppt.servico_id,
                            totalAmount: totalGeral,
                            paymentMethod: checkoutPagamento,
                            installments: checkoutPagamento === 'CREDITO' ? checkoutParcelas : 1,
                            appointmentDate: checkoutAppt.data,
                            taxasCustom: taxasPagamento,
                          });
                          
                          fecharCheckout();
                          alert(`Atendimento concluído com sucesso!\nTotal recebido: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}${valorDesconto > 0 ? `\nDesconto cliente: -${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDesconto)} (${checkoutDescontoPct || '0'}%)` : ''}${taxaMaq.valorTaxa > 0 ? `\nTaxa maquininha (${taxaMaq.regraNome}): -${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxaMaq.valorTaxa)}\nLíquido do Salão: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxaMaq.valorLiquido)}` : ''}\nInsumos, produtos e comissão registrados.`);
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
              {/* 1. Cliente com Busca e Seleção Inteligente */}
              <div ref={clienteSearchContainerRef} className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground/70 flex items-center justify-between">
                  <span>1. Cliente *</span>
                  {clienteSelecionado ? (
                    <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                      <Check size={12} /> Cliente selecionado
                    </span>
                  ) : (
                    <span className="text-[11px] font-normal text-foreground/50">
                      {clientes.length} clientes cadastrados
                    </span>
                  )}
                </label>

                <input type="hidden" name="cliente_id" value={formData.cliente_id} required />

                {clienteSelecionado ? (
                  /* Card do Cliente Selecionado */
                  <div className="p-3 bg-gold/10 border border-gold/40 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gold text-background font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {clienteSelecionado.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground flex items-center gap-2">
                          <span className="truncate">{clienteSelecionado.nome}</span>
                          {clienteSelecionado.codigo && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-gold/20 text-gold rounded shrink-0">
                              #{clienteSelecionado.codigo}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-foreground/60 flex items-center gap-2 mt-0.5">
                          {clienteSelecionado.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} className="text-gold" />
                              {formatPhone(clienteSelecionado.telefone)}
                            </span>
                          )}
                          {clienteSelecionado.email && (
                            <span className="truncate max-w-[150px] hidden sm:inline text-foreground/40">
                              • {clienteSelecionado.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(f => ({ ...f, cliente_id: '' }));
                        setBuscaCliente('');
                        setClienteDropdownAberto(true);
                      }}
                      className="text-xs text-gold hover:text-gold-dim border border-gold/40 hover:border-gold px-3 py-1.5 rounded-lg transition-colors font-bold shrink-0 bg-background/50 hover:bg-background"
                    >
                      Trocar
                    </button>
                  </div>
                ) : cadastrandoNovoCliente ? (
                  /* Formulário de Cadastro Rápido de Novo Cliente */
                  <div className="p-3.5 bg-[var(--background)] border border-gold/40 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                      <span className="text-xs font-bold text-gold flex items-center gap-1.5">
                        <UserPlus size={14} /> Cadastrar Novo Cliente Rápido
                      </span>
                      <button
                        type="button"
                        onClick={() => setCadastrandoNovoCliente(false)}
                        className="text-xs text-foreground/50 hover:text-foreground"
                      >
                        Voltar à busca
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-foreground/70 mb-1">Nome Completo *</label>
                        <input
                          type="text"
                          value={novoClienteNome}
                          onChange={e => setNovoClienteNome(e.target.value)}
                          placeholder="Nome da cliente"
                          className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-gold"
                          required
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-foreground/70 mb-1">WhatsApp / Telefone *</label>
                        <input
                          type="tel"
                          value={novoClienteTelefone}
                          onChange={e => setNovoClienteTelefone(e.target.value)}
                          placeholder="(42) 99999-9999"
                          className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-gold font-mono"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCadastrandoNovoCliente(false)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-foreground/70 hover:bg-white/5"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={salvandoNovoCliente || !novoClienteNome.trim() || !novoClienteTelefone.trim()}
                        onClick={handleSalvarNovoClienteRapido}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gold text-background font-bold hover:bg-gold-dim transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        {salvandoNovoCliente ? 'Salvando...' : 'Salvar e Selecionar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Campo de Busca Interativo com Autocomplete */
                  <div className="relative">
                    <div className="flex items-center bg-[var(--background)] border border-[var(--border-subtle)] focus-within:border-gold rounded-lg px-3 py-2.5 transition-colors">
                      <Search size={16} className="text-foreground/40 shrink-0 mr-2" />
                      <input
                        type="text"
                        value={buscaCliente}
                        onChange={e => {
                          setBuscaCliente(e.target.value);
                          setClienteDropdownAberto(true);
                        }}
                        onFocus={() => setClienteDropdownAberto(true)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (clientesFiltradosModal.length > 0) {
                              const c = clientesFiltradosModal[0];
                              setFormData(f => ({ ...f, cliente_id: c.id }));
                              setClienteDropdownAberto(false);
                              setBuscaCliente('');
                            }
                          }
                        }}
                        placeholder="Buscar cliente por nome, telefone ou código..."
                        className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-foreground/40"
                        autoFocus
                      />
                      {buscaCliente && (
                        <button
                          type="button"
                          onClick={() => setBuscaCliente('')}
                          className="text-foreground/40 hover:text-foreground p-0.5 shrink-0"
                          title="Limpar texto"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Dropdown Flutuante */}
                    {clienteDropdownAberto && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95">
                        {clientesFiltradosModal.length > 0 ? (
                          <>
                            <div className="p-2 text-[10px] font-bold text-foreground/50 uppercase tracking-wider bg-foreground/[0.02]">
                              {buscaCliente ? `Resultados (${clientesFiltradosModal.length}) — Pressione Enter para selecionar` : 'Clientes recentes / ordem alfabética'}
                            </div>
                            {clientesFiltradosModal.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setFormData(f => ({ ...f, cliente_id: c.id }));
                                  setClienteDropdownAberto(false);
                                  setBuscaCliente('');
                                }}
                                className="w-full text-left p-2.5 hover:bg-gold/10 transition-colors flex items-center justify-between gap-3 group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-gold/15 text-gold font-bold text-xs flex items-center justify-center shrink-0">
                                    {c.nome.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-sm text-foreground truncate group-hover:text-gold transition-colors flex items-center gap-1.5">
                                      <span>{c.nome}</span>
                                      {c.codigo && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-foreground/10 text-foreground/70 rounded">
                                          #{c.codigo}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-foreground/50 flex items-center gap-2 mt-0.5">
                                      {c.telefone && <span>{formatPhone(c.telefone)}</span>}
                                      {c.email && <span className="truncate max-w-[140px] hidden sm:inline">• {c.email}</span>}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs text-gold font-semibold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Selecionar →
                                </span>
                              </button>
                            ))}
                          </>
                        ) : (
                          <div className="p-4 text-center">
                            <p className="text-xs text-foreground/60 mb-2">
                              Nenhum cliente encontrado com "{buscaCliente}"
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setCadastrandoNovoCliente(true);
                                setNovoClienteNome(buscaCliente);
                                setClienteDropdownAberto(false);
                              }}
                              className="text-xs font-bold text-gold hover:underline flex items-center justify-center gap-1.5 mx-auto"
                            >
                              <UserPlus size={14} /> Cadastrar "{buscaCliente}" como novo cliente
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão Atalho para Cadastrar Novo */}
                    <div className="mt-1.5 flex justify-between items-center text-[11px]">
                      <span className="text-foreground/40 italic">
                        {buscaCliente ? 'Clique no cliente desejado' : 'Digite para buscar na lista'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCadastrandoNovoCliente(true);
                          setNovoClienteNome(buscaCliente);
                          setClienteDropdownAberto(false);
                        }}
                        className="text-gold hover:underline flex items-center gap-1 font-bold"
                      >
                        <UserPlus size={12} /> + Novo cliente
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Profissional PRIMEIRO */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User2 size={14} className="text-gold" />
                    2. Profissional *
                  </span>
                  {categoriaFiltro !== 'todas' && (
                    <span className="text-[10px] text-gold font-medium">
                      Filtro ativo: {categoriaFiltro === 'Unhas' ? '💅 Unhas' : '✂️ Cabelo'}
                    </span>
                  )}
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
                  {profissionais.some(p => getCategoriaProfissional(p) === 'Cabelo') && (
                    <optgroup label="✂️ Cabelo">
                      {profissionais.filter(p => getCategoriaProfissional(p) === 'Cabelo').map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </optgroup>
                  )}
                  {profissionais.some(p => getCategoriaProfissional(p) === 'Unhas') && (
                    <optgroup label="💅 Unhas">
                      {profissionais.filter(p => getCategoriaProfissional(p) === 'Unhas').map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </optgroup>
                  )}
                  {profissionais.some(p => !['Cabelo', 'Unhas'].includes(getCategoriaProfissional(p))) && (
                    <optgroup label="Outras Categorias">
                      {profissionais.filter(p => !['Cabelo', 'Unhas'].includes(getCategoriaProfissional(p))).map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </optgroup>
                  )}
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
                      : (servicosDoProfissional.length === 0
                          ? 'Nenhum procedimento vinculado a este profissional'
                          : 'Selecione o procedimento')}
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
