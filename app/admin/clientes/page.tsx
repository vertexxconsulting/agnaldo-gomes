'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Edit, Trash2, FileText, ChevronDown, ChevronUp, History, X, MapPin } from 'lucide-react';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/SectionTitle';
import { getClientes, getAgendamentos, getServicos, getProfissionais, getServicoNome, getServicoPreco, getProfissionalNome, STATUS_LABELS } from '@/lib/mock-data';
import type { Cliente, Agendamento, Servico, Profissional } from '@/lib/gestao-types';

// Utilitários para dividir e compor endereços de forma inteligente
function parseEndereco(raw?: string | null) {
  if (!raw) return { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '' };

  let clean = raw.trim();
  let cep = '';

  const cepMatch = clean.match(/(?:CEP:?\s*)?(\d{5}-?\d{3})/i);
  if (cepMatch) {
    cep = cepMatch[1];
    clean = clean.replace(cepMatch[0], '').replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();
  }

  const parts = clean.split(',').map(p => p.trim());

  let rua = '';
  let numero = '';
  let complemento = '';
  let bairro = '';
  let cidade = '';

  if (parts.length >= 4) {
    rua = parts[0] || '';
    const numPart = parts[1] || '';
    if (numPart.includes(' - ')) {
      const [n, c] = numPart.split(' - ');
      numero = n.trim();
      complemento = c.trim();
    } else {
      numero = numPart;
    }
    bairro = parts[2] || '';
    cidade = parts.slice(3).join(', ') || '';
  } else if (parts.length === 3) {
    rua = parts[0] || '';
    numero = parts[1] || '';
    cidade = parts[2] || '';
  } else if (parts.length === 2) {
    rua = parts[0] || '';
    numero = parts[1] || '';
  } else {
    rua = clean;
  }

  return { cep, rua, numero, complemento, bairro, cidade };
}

function comporEndereco(partes: {
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  complemento?: string;
  cep?: string;
}) {
  const rua = (partes.rua || '').trim();
  const numero = (partes.numero || '').trim();
  const complemento = (partes.complemento || '').trim();
  const bairro = (partes.bairro || '').trim();
  const cidade = (partes.cidade || '').trim();
  const cep = (partes.cep || '').trim();

  const numFormatado = [numero, complemento].filter(Boolean).join(' - ');

  const tokens = [
    rua,
    numFormatado,
    bairro,
    cidade,
    cep ? `CEP ${cep}` : '',
  ].filter(t => t !== '');

  return tokens.join(', ');
}

export default function ClienteModule() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const porPagina = 50;
  
  // Estados para o form
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  // Estados de endereço detalhado
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [complemento, setComplemento] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const numeroRef = useRef<HTMLInputElement>(null);

  const buscarCep = async (cepInput: string) => {
    const cepLimpo = cepInput.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setRua(data.logradouro);
        if (data.bairro) setBairro(data.bairro);
        if (data.localidade) {
          setCidade(`${data.localidade}${data.uf ? ' - ' + data.uf : ''}`);
        }
        setTimeout(() => {
          numeroRef.current?.focus();
        }, 100);
      }
    } catch (e) {
      console.error('Erro ao buscar CEP', e);
    } finally {
      setBuscandoCep(false);
    }
  };

  const abrirNovoCliente = () => {
    setEditando(null);
    setCep('');
    setRua('');
    setNumero('');
    setBairro('');
    setCidade('');
    setComplemento('');
    setShowForm(true);
  };

  const abrirEdicaoCliente = (c: Cliente) => {
    setEditando(c);
    const parsed = parseEndereco(c.endereco);
    setCep(parsed.cep);
    setRua(parsed.rua);
    setNumero(parsed.numero);
    setBairro(parsed.bairro);
    setCidade(parsed.cidade);
    setComplemento(parsed.complemento);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Carregar dados do Supabase (com fallback para mock)
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const [clientesData, agendamentosData, servicosData, profissionaisData] = await Promise.all([
        getClientes(),
        getAgendamentos(),
        getServicos(),
        getProfissionais(),
      ]);
      setClientes(clientesData);
      setAgendamentos(agendamentosData);
      setServicos(servicosData);
      setProfissionais(profissionaisData);
      setLoading(false);
    };
    carregarDados();
  }, []);

  // Calcula estatísticas do CRM (Ticket Médio, Visitas, Faturamento Total, Última Visita)
  const statsCliente = (clienteId: string) => {
    const ags = agendamentos.filter(a => a.cliente_id === clienteId && a.status === 'concluido');
    const todosAgs = agendamentos.filter(a => a.cliente_id === clienteId);
    
    // Sort desc por data
    todosAgs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    const totalGasto = ags.reduce((sum, a) => {
      const valor = (a.total_amount != null && Number(a.total_amount) > 0)
        ? Number(a.total_amount)
        : getServicoPreco(a.servico_id, servicos);
      return sum + valor;
    }, 0);
    const visitas = ags.length;
    const ticketMedio = visitas > 0 ? Math.round(totalGasto / visitas) : 0;
    
    return {
      visitas,
      totalGasto,
      ticketMedio,
      historico: todosAgs,
      ultimaVisita: ags.length > 0 ? ags[0].data : null
    };
  };

  const clientesFiltrados = [...clientes]
    .filter((c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.includes(busca) ||
      (c.email ?? '').toLowerCase().includes(busca.toLowerCase())
    )
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const totalPaginas = Math.ceil(clientesFiltrados.length / porPagina);
  const clientesPaginados = clientesFiltrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const enderecoCompleto = comporEndereco({
      rua,
      numero,
      bairro,
      cidade,
      complemento,
      cep,
    });

    const payload = {
      id: editando?.id,
      codigo: form.get('codigo') as string,
      nome: form.get('nome') as string,
      telefone: form.get('telefone') as string,
      email: (form.get('email') as string) || null,
      cpf: (form.get('cpf') as string) || null,
      endereco: enderecoCompleto || null,
      nascimento: (form.get('nascimento') as string) || null,
      observacoes: (form.get('observacoes') as string) || null,
    };

    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar cliente');

      const savedCliente: Cliente = data.cliente ? {
        id: data.cliente.id,
        codigo: data.cliente.codigo,
        nome: data.cliente.name,
        telefone: data.cliente.phone,
        email: data.cliente.email,
        cpf: data.cliente.cpf,
        endereco: data.cliente.address,
        nascimento: data.cliente.birth_date,
        observacoes: data.cliente.notes,
        criado_em: data.cliente.created_at,
      } : {
        id: editando?.id ?? `c${Date.now()}`,
        codigo: editando?.codigo,
        nome: payload.nome,
        telefone: payload.telefone,
        email: payload.email,
        cpf: payload.cpf,
        endereco: payload.endereco,
        nascimento: payload.nascimento,
        observacoes: payload.observacoes,
        criado_em: editando?.criado_em ?? new Date().toISOString()
      };

      if (editando) {
        setClientes(prev => prev.map(c => c.id === editando.id ? savedCliente : c));
      } else {
        setClientes(prev => [savedCliente, ...prev]);
      }
      setEditando(null);
      setShowForm(false);
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      alert(`Erro ao salvar no banco: ${err.message}`);
    }
  };

  const excluir = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      const res = await fetch(`/api/clientes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir');
      }
      setClientes(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Erro ao excluir cliente:', err);
      alert(`Erro ao excluir no banco: ${err.message}`);
    }
  };

  return (
    <div className="py-4">
      <SectionTitle title="Clientes (CRM)" subtitle="Gestão de relacionamento e histórico" align="left" />

      {/* Busca + nova ação */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            className="w-full pl-10 pr-10 py-2.5 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Buscar por nome, telefone ou e-mail..."
          />
          {busca && (
            <button 
              onClick={() => { setBusca(''); setPagina(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <Button variant="primary" size="md" className="sm:w-auto w-full" onClick={abrirNovoCliente}>
          <UserPlus size={18} className="mr-2" /> Novo Cliente
        </Button>
      </div>

      {loading && (
        <div className="text-center py-6 text-foreground/50">Carregando clientes...</div>
      )}

      {/* Formulário de Criação/Edição */}
      {showForm && (
        <CardGlass className="mb-6 p-6">
          <h3 className="text-lg font-bold mb-4">{editando ? `Editar Cliente ${editando.codigo ? `(Cód: ${editando.codigo})` : ''}` : 'Novo Cliente'}</h3>
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Nome Completo *</label>
                <input name="nome" required defaultValue={editando?.nome ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Código (Opcional)</label>
                <input name="codigo" type="number" defaultValue={editando?.codigo ?? ''} placeholder="Automático" className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Telefone / WhatsApp *</label>
                <input name="telefone" required defaultValue={editando?.telefone ?? ''} placeholder="Ex: 11999999999" className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">E-mail <span className="text-foreground/30">(opcional)</span></label>
                <input name="email" type="email" defaultValue={editando?.email ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">CPF <span className="text-foreground/30">(opcional)</span></label>
                <input name="cpf" type="text" placeholder="Apenas números ou formatado" defaultValue={editando?.cpf ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Data de Nascimento <span className="text-foreground/30">(opcional)</span></label>
                <input name="nascimento" type="date" defaultValue={editando?.nascimento ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold [color-scheme:light] dark:[color-scheme:dark]" />
              </div>

              {/* Seção de Endereço Detalhado: CEP, Rua, Número, Bairro, Cidade, Complemento */}
              <div className="md:col-span-2 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-xs uppercase font-bold tracking-wider text-foreground flex items-center gap-1.5 mb-3">
                  <MapPin size={14} className="text-foreground" /> Endereço do Cliente
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* CEP com Busca Automática */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-foreground/60 mb-1 font-semibold flex items-center justify-between">
                      <span>CEP</span>
                      {buscandoCep && <span className="text-[10px] text-foreground font-normal animate-pulse">Buscando...</span>}
                    </label>
                    <input 
                      type="text" 
                      placeholder="00000-000"
                      value={cep}
                      maxLength={9}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                        const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
                        setCep(formatted);
                        if (raw.length === 8) {
                          buscarCep(raw);
                        }
                      }}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold font-mono" 
                    />
                  </div>

                  {/* Rua / Logradouro */}
                  <div className="sm:col-span-6">
                    <label className="block text-xs text-foreground/60 mb-1 font-semibold">
                      Rua / Logradouro
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Rua João Siqueira Filho"
                      value={rua}
                      onChange={(e) => setRua(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold"
                    />
                  </div>

                  {/* Número */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-foreground/60 mb-1 font-semibold">
                      Número
                    </label>
                    <input
                      ref={numeroRef}
                      type="text"
                      placeholder="Ex: 120 ou S/N"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold font-mono"
                    />
                  </div>

                  {/* Bairro */}
                  <div className="sm:col-span-4">
                    <label className="block text-xs text-foreground/60 mb-1 font-semibold">
                      Bairro
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Socomim"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="sm:col-span-5">
                    <label className="block text-xs text-foreground/60 mb-1 font-semibold">
                      Cidade / UF
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Telêmaco Borba - PR"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold"
                    />
                  </div>

                  {/* Complemento */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-foreground/60 mb-1 font-semibold">
                      Complemento <span className="text-foreground/30 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Apto 101, Bloco B"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs text-foreground/60 mb-1">Observações / Preferências <span className="text-foreground/30">(opcional)</span></label>
              <textarea name="observacoes" rows={3} defaultValue={editando?.observacoes ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-gold resize-none" placeholder="Alergias, formato de rosto, preferências de corte..." />
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <Button type="button" variant="ghost" size="md" onClick={() => { setShowForm(false); setEditando(null); }}>Cancelar</Button>
              <Button type="submit" variant="primary" size="md">Salvar Cliente</Button>
            </div>
          </form>
        </CardGlass>
      )}

      {/* Lista Expandível */}
      <div className="flex flex-col gap-3">
        {clientesFiltrados.length === 0 ? (
          <CardGlass className="py-8 text-center text-foreground/50">
            {busca ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
          </CardGlass>
        ) : (
          clientesPaginados.map((c) => {
            const stats = statsCliente(c.id);
            const isExpanded = expandido === c.id;

            return (
              <CardGlass key={c.id} className="p-0 overflow-hidden transition-all duration-300">
                {/* Header (Sempre visível) */}
                <div 
                  className={`p-4 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:bg-foreground/5 transition-colors ${isExpanded ? 'bg-foreground/5 border-b border-[var(--border-subtle)]' : ''}`}
                  onClick={() => setExpandido(isExpanded ? null : c.id)}
                >
                  {/* Info Principal */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                      {c.nome}
                      {c.codigo && <span className="text-sm text-foreground/40 font-normal ml-1">(Cód: {c.codigo})</span>}
                      {stats.visitas >= 5 && <span className="px-2 py-0.5 rounded-full text-[10px] bg-gold/20 text-gold uppercase tracking-wider font-bold border border-gold/30">VIP</span>}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/60">
                      <span className="font-mono">{c.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}</span>
                      {c.email && <span>{c.email}</span>}
                    </div>
                  </div>

                    <div className="flex items-center gap-6 sm:px-4">
                      <div className="text-center">
                        <div className="text-xs text-foreground/40 uppercase tracking-wider">Pontos</div>
                        <div className="font-bold text-[var(--accent)] flex items-center gap-1 justify-center">
                          {c.loyalty_points || 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-foreground/40 uppercase tracking-wider">Visitas</div>
                        <div className="font-bold text-foreground">{stats.visitas}</div>
                      </div>
                      <div className="text-center hidden sm:block">
                        <div className="text-xs text-foreground/40 uppercase tracking-wider">Ticket Médio</div>
                        <div className="font-bold text-gold">R$ {stats.ticketMedio}</div>
                      </div>
                    </div>

                  {/* Icon Expandir */}
                  <div className="hidden sm:flex shrink-0 w-8 h-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/50">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Área Expandida (Detalhes + Histórico) */}
                {isExpanded && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-foreground/[0.03]">
                    {/* Coluna 1: Dados & Observações */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/40 mb-2 flex items-center gap-1"><FileText size={12}/> Observações</h4>
                        {c.observacoes ? (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500/90 text-sm">
                            {c.observacoes}
                          </div>
                        ) : (
                          <span className="text-sm text-foreground/40 italic">Sem observações cadastradas.</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <div className="text-xs text-foreground/40 mb-1">Nascimento</div>
                          <div className="text-sm">{c.nascimento ? new Date(c.nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-foreground/40 mb-1">Cliente desde</div>
                          <div className="text-sm">{new Date(c.criado_em).toLocaleDateString('pt-BR')}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
                        <div>
                          <div className="text-xs text-foreground/40 mb-1">CPF</div>
                          <div className="text-sm font-medium">{c.cpf || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-foreground/40 mb-1">Endereço</div>
                          <div className="text-sm text-foreground/80 leading-relaxed">{c.endereco || '—'}</div>
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs py-1.5 h-auto" onClick={(e) => { e.stopPropagation(); abrirEdicaoCliente(c); }}><Edit size={14} className="mr-1"/> Editar</Button>
                        <Button variant="outline" size="sm" className="text-red-400 border-red-500/20 hover:bg-red-500/10 h-auto py-1.5" onClick={(e) => { e.stopPropagation(); excluir(c.id); }}><Trash2 size={14}/></Button>
                      </div>
                    </div>

                    {/* Coluna 2 e 3: Histórico de Agendamentos */}
                    <div className="md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/40 mb-3 flex items-center gap-1"><History size={12}/> Histórico de Agendamentos</h4>
                      
                      {stats.historico.length === 0 ? (
                        <div className="text-sm text-foreground/40 p-4 border border-[var(--border-subtle)] rounded-md text-center">Nenhum agendamento no histórico.</div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {stats.historico.map(ag => {
                            const nomeServico = getServicoNome(ag.servico_id, servicos);
                            const nomeProf = getProfissionalNome(ag.profissional_id, profissionais);
                            const valor = (ag.total_amount != null && Number(ag.total_amount) > 0)
                              ? Number(ag.total_amount)
                              : getServicoPreco(ag.servico_id, servicos);

                            const partesData = ag.data ? ag.data.split('T')[0].split('-') : [];
                            const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : ag.data;

                            return (
                              <div key={ag.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 rounded-md border border-[var(--border-subtle)] bg-foreground/[0.02] gap-2">
                                <div>
                                  <div className="text-sm font-bold flex flex-wrap items-center gap-2">
                                    <span>{nomeServico}</span>
                                    <span className="text-xs text-foreground/60 font-normal">com {nomeProf}</span>
                                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-medium border
                                      ${ag.status === 'concluido' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' : 
                                        ag.status === 'cancelado' || ag.status === 'no_show' ? 'text-red-400 border-red-400/20 bg-red-400/10' : 
                                        'text-blue-400 border-blue-400/20 bg-blue-400/10'}`}
                                    >
                                      {STATUS_LABELS[ag.status]}
                                    </span>
                                  </div>
                                  <div className="text-xs text-foreground/60 mt-1 flex flex-wrap items-center gap-3">
                                    <span>📅 {dataFormatada} às {ag.hora_inicio}</span>
                                    {ag.payment_method && (
                                      <span className="px-1.5 py-0.5 rounded bg-foreground/10 text-[10px] font-medium">
                                        💳 {ag.payment_method}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-center">
                                  <span className="text-sm font-bold text-emerald-500">
                                    R$ {valor.toFixed(2)}
                                  </span>
                                  {c.cpf && (
                                    <a 
                                      href={`/admin/notas-fiscais?cpf=${c.cpf}&agendamentoId=${ag.id}`}
                                      className="text-xs px-2.5 py-1 rounded bg-gold/10 text-gold border border-gold/30 hover:bg-gold hover:text-black transition-colors font-medium flex items-center gap-1"
                                      title="Emitir Nota Fiscal para este serviço"
                                    >
                                      Emitir NF
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardGlass>
            );
          })
        )}
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="ghost"
            size="sm"
            disabled={pagina === 1}
            onClick={() => setPagina(p => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-foreground/60">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={pagina === totalPaginas}
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
