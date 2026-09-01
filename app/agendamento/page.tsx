'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  X, 
  Search, 
  Phone, 
  Crown, 
  Copy, 
  Check, 
  ShieldCheck, 
  MessageCircle, 
  Sparkles,
  AlertTriangle,
  UserCheck,
  Info
} from 'lucide-react';
import { Button } from '@/components/Button';
import { getServicos, getProfissionais, getClientes, getProfissionalServico } from '@/lib/mock-data';
import type { Servico, Profissional, Cliente, ProfissionalServico } from '@/lib/gestao-types';
import { obterHorariosSalao, DEFAULT_HORARIOS_SALAO } from '@/lib/ia-config';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

const DIAS_CHAVE = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export default function AgendamentoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicoParam = searchParams.get('servico');

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profServicos, setProfServicos] = useState<ProfissionalServico[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Ordem: telefone -> profissional -> servico -> data -> confirmacao
  const [step, setStep] = useState<'telefone' | 'profissional' | 'servico' | 'data' | 'confirmacao' | 'pagamento_noiva'>('telefone');
  const [telefoneVerificado, setTelefoneVerificado] = useState(false);
  const [errorWhatsApp, setErrorWhatsApp] = useState('');
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [pixNoivaData, setPixNoivaData] = useState<{
    agendamentoId: string;
    valorTotal: number;
    valorSinal: number;
    pixCopiaCola: string;
    qrcodeBase64: string;
    whatsappUrl: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    profissionalId: '',
    servicoId: servicoParam || '',
    clienteId: '',
    data: '',
    hora: '',
    nome: '',
    telefone: '',
    email: '',
  });

  // Carregar dados
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const [sData, pData, cData, psData] = await Promise.all([
        getServicos(),
        getProfissionais(),
        getClientes(),
        getProfissionalServico()
      ]);
      setServicos(sData);
      setProfissionais(pData.filter(p => p.ativo));
      setClientes(cData);
      setProfServicos(psData);

      // Se veio com servicoParam, tenta pré-selecionar o profissional vinculado
      if (servicoParam) {
        const vinculo = psData.find(ps => ps.servico_id === servicoParam);
        if (vinculo) {
          setFormData(prev => ({ ...prev, profissionalId: vinculo.profissional_id, servicoId: servicoParam }));
        }
      }

      setLoading(false);
    };
    carregarDados();
  }, [servicoParam]);

  const steps: Array<'telefone' | 'profissional' | 'servico' | 'data' | 'confirmacao'> = [
    'telefone', 
    'profissional', 
    'servico', 
    'data',
    'confirmacao'
  ];

  // Profissional selecionado
  const profissionalSelecionado = profissionais.find(p => p.id === formData.profissionalId);

  // Serviços filtrados pelo profissional selecionado
  const servicosDoProfissional = useMemo(() => {
    if (!formData.profissionalId) return [];
    const idsVinculados = profServicos
      .filter(ps => ps.profissional_id === formData.profissionalId)
      .map(ps => ps.servico_id);

    if (idsVinculados.length > 0) {
      return servicos.filter(s => s.ativo && s.visivel_app && idsVinculados.includes(s.id));
    }
    return servicos.filter(s => s.ativo && s.visivel_app);
  }, [formData.profissionalId, profServicos, servicos]);

  // Serviço selecionado
  const servicoSelecionado = servicos.find(s => s.id === formData.servicoId);

  // Regra de Negócio: Dia da Noiva e Maquiagem Profissional (sinal obrigatório de 50%)
  const nomeSvc = (servicoSelecionado?.nome || '').toLowerCase();
  const isNoiva = servicoSelecionado?.categoria === 'Noivas' || nomeSvc.includes('noiva') || nomeSvc.includes('maquiagem profissional');
  const valorTotalServico = Number(servicoSelecionado?.preco || 0);
  const valorSinalNoiva = isNoiva ? Math.round(valorTotalServico * 0.5 * 100) / 100 : 0;
  const valorRestanteNoiva = isNoiva ? Math.round((valorTotalServico - valorSinalNoiva) * 100) / 100 : 0;

  const formatPhone = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    if (clean.length === 0) return '';
    if (clean.length <= 2) return `(${clean}`;
    if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  };

  const handleInputChange = (field: string, value: string) => {
    let finalValue = value;
    if (field === 'telefone') {
      finalValue = formatPhone(value);
    }
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  const verificarTelefone = () => {
    if (!formData.telefone || formData.telefone.length < 10) {
      setErrorWhatsApp('Digite um WhatsApp válido com DDD');
      return;
    }
    setErrorWhatsApp('');
    const numLimpo = formData.telefone.replace(/\D/g, '');
    const clienteExistente = clientes.find(c => (c.telefone || '').replace(/\D/g, '') === numLimpo);
    
    if (clienteExistente) {
      setFormData(prev => ({
        ...prev,
        nome: clienteExistente.nome,
        email: clienteExistente.email || '',
        clienteId: clienteExistente.id
      }));
      nextStep();
    } else {
      setTelefoneVerificado(true);
    }
  };

  const nextStep = () => {
    const idx = steps.indexOf(step as any);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const idx = steps.indexOf(step as any);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  // Cálculo de Datas Disponíveis (Próximos 14 dias)
  const datasDisponiveis = useMemo(() => {
    const lista: Array<{ value: string; label: string; diaSemana: number; abertoSalao: boolean; profAtende: boolean }> = [];
    const hojeObj = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date(hojeObj);
      d.setDate(d.getDate() + i);
      const diaSemana = d.getDay();
      const isoDate = d.toISOString().split('T')[0];
      const horariosSalao = typeof window !== 'undefined' ? obterHorariosSalao() : DEFAULT_HORARIOS_SALAO;
      const salaoAberto = (horariosSalao[diaSemana] || DEFAULT_HORARIOS_SALAO[diaSemana]).aberto;

      let profAtende = salaoAberto;
      if (profissionalSelecionado?.jornada_semanal) {
        const chave = DIAS_CHAVE[diaSemana];
        const cfg = profissionalSelecionado.jornada_semanal[diaSemana] || (chave ? profissionalSelecionado.jornada_semanal[chave] : undefined);
        if (cfg) {
          profAtende = cfg.ativo !== false;
        }
      }

      lista.push({
        value: isoDate,
        label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }),
        diaSemana,
        abertoSalao: salaoAberto,
        profAtende,
      });
    }
    return lista;
  }, [profissionalSelecionado]);

  // Cálculo dos Horários Livres para a data e profissional selecionados
  const { slotsHorarios, statusData } = useMemo(() => {
    if (!formData.data || !profissionalSelecionado) {
      return { slotsHorarios: [], statusData: null };
    }

    const [ano, mes, dia] = formData.data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.getDay();

    const horariosSalao = typeof window !== 'undefined' ? obterHorariosSalao() : DEFAULT_HORARIOS_SALAO;
    const infoSalao = horariosSalao[diaSemana] || DEFAULT_HORARIOS_SALAO[diaSemana];
    const jornadaProf = profissionalSelecionado.jornada_semanal;

    let profAtende = infoSalao.aberto;
    let horaIni = infoSalao.inicio;
    let horaFim = infoSalao.fim;

    if (jornadaProf) {
      const chave = DIAS_CHAVE[diaSemana];
      const cfg = jornadaProf[diaSemana] || (chave ? jornadaProf[chave] : undefined);
      if (cfg) {
        profAtende = cfg.ativo !== false;
        if (cfg.inicio) horaIni = cfg.inicio;
        if (cfg.fim) horaFim = cfg.fim;
      }
    }

    if (!profAtende && !infoSalao.aberto) {
      return {
        slotsHorarios: [],
        statusData: { tipo: 'fechado', texto: 'Salão fechado aos domingos e segundas-feiras.' }
      };
    }

    if (!profAtende) {
      return {
        slotsHorarios: [],
        statusData: { tipo: 'folga', texto: `${profissionalSelecionado.nome} não atende neste dia da semana.` }
      };
    }

    const [hIni, mIni] = horaIni.split(':').map(Number);
    const [hFim, mFim] = horaFim.split(':').map(Number);
    const totalIni = hIni * 60 + mIni;
    const totalFim = hFim * 60 + mFim;

    const slots: string[] = [];
    for (let m = totalIni; m < totalFim; m += 30) {
      const hStr = String(Math.floor(m / 60)).padStart(2, '0');
      const minStr = String(m % 60).padStart(2, '0');
      slots.push(`${hStr}:${minStr}`);
    }

    return {
      slotsHorarios: slots,
      statusData: { tipo: 'aberto', texto: `Horário de atendimento: ${horaIni} às ${horaFim}` }
    };
  }, [formData.data, profissionalSelecionado]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 'confirmacao') {
      nextStep();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/agendamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao salvar agendamento');
      }

      const resData = await res.json();

      if (resData.isNoiva) {
        setPixNoivaData({
          agendamentoId: resData.id,
          valorTotal: resData.valorTotal,
          valorSinal: resData.valorSinal,
          pixCopiaCola: resData.pixCopiaCola,
          qrcodeBase64: resData.qrcodeBase64,
          whatsappUrl: resData.whatsappUrl,
        });
        setStep('pagamento_noiva');
        setLoading(false);
        return;
      }

      window.location.href = resData.whatsappUrl;
    } catch (err: any) {
      console.error('Erro no agendamento:', err);
      alert(`Erro: ${err.message || 'Ocorreu um erro ao processar seu agendamento. Tente novamente.'}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-transparent to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground/70">Carregando horários e serviços do Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-transparent to-primary/5 py-8 lg:py-12">
      <PWAInstallPrompt />
      <div className="max-w-5xl mx-auto px-4">
        
        {/* Header Centralizado acima das colunas */}
        <div className="text-center mb-8 lg:mb-10">
          <h1 className="text-3xl font-black text-foreground mb-2 flex flex-col items-center justify-center gap-2">
            {formData.nome && step !== 'telefone' && (
              <span className="text-xl font-bold text-primary tracking-tight">Olá, {formData.nome}!</span>
            )}
            <div className="flex items-center justify-center gap-2">
              {isNoiva && <Crown size={28} className="text-amber-500" />}
              {isNoiva ? 'Reserva Dia da Noiva' : 'Agende seu Horário'}
            </div>
          </h1>
          <p className="text-foreground/60 text-sm">
            {isNoiva 
              ? 'Garanta exclusividade e reserve sua data com Agnaldo Gomes.' 
              : 'Siga os passos abaixo para reservar seu atendimento.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Coluna Esquerda: Instruções / Guia Lateral */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-8">
            <div className="hidden lg:block bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-foreground mb-4">Como funciona?</h3>
              <ul className="space-y-4 text-sm text-foreground/70">
                <li className="flex gap-3">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${steps.indexOf(step as any) >= 0 ? 'bg-primary text-black' : 'bg-foreground/10 text-foreground/40'}`}>1</div>
                  <span><strong className="text-foreground">Identificação:</strong> Informe seu WhatsApp.</span>
                </li>
                <li className="flex gap-3">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${steps.indexOf(step as any) >= 1 ? 'bg-primary text-black' : 'bg-foreground/10 text-foreground/40'}`}>2</div>
                  <span><strong className="text-foreground">Profissional:</strong> Escolha quem irá lhe atender.</span>
                </li>
                <li className="flex gap-3">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${steps.indexOf(step as any) >= 2 ? 'bg-primary text-black' : 'bg-foreground/10 text-foreground/40'}`}>3</div>
                  <span><strong className="text-foreground">Serviço:</strong> Selecione o procedimento.</span>
                </li>
                <li className="flex gap-3">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${steps.indexOf(step as any) >= 3 ? 'bg-primary text-black' : 'bg-foreground/10 text-foreground/40'}`}>4</div>
                  <span><strong className="text-foreground">Data/Hora:</strong> Escolha o melhor momento.</span>
                </li>
                <li className="flex gap-3">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${steps.indexOf(step as any) >= 4 ? 'bg-primary text-black' : 'bg-foreground/10 text-foreground/40'}`}>5</div>
                  <span><strong className="text-foreground">Confirmação:</strong> Finalize seu agendamento!</span>
                </li>
              </ul>
              
              <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-xs text-foreground/50 flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5 text-primary" />
                <p>O agendamento é rápido e 100% online. Se precisar de ajuda, chame no WhatsApp do salão.</p>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Container do Formulário */}
          <div className="lg:col-span-8">
            {/* Progress Steps (Mobile Only) */}
            {step !== 'pagamento_noiva' && (
              <div className="flex justify-center mb-6 lg:hidden">
                <div className="flex items-center gap-3 sm:gap-4">
                  {steps.map((s, idx) => {
                    const isActive = s === step;
                    const isCompleted = steps.indexOf(step as any) > idx;
                    return (
                      <div key={s} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          isActive ? 'bg-primary text-black ring-4 ring-primary/20' : isCompleted ? 'bg-primary text-black' : 'bg-foreground/10 text-foreground/40'
                        }`}>
                          {idx + 1}
                        </div>
                        {idx < steps.length - 1 && <div className={`w-8 sm:w-12 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-foreground/10'}`} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="max-w-[520px] mx-auto lg:ml-0 lg:mr-auto bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 shadow-2xl">

          {/* Passo 1: Telefone / Identificação */}
          {step === 'telefone' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Phone size={20} className="text-primary" /> Identificação
              </h2>
              <p className="text-sm text-foreground/60">
                {!telefoneVerificado 
                  ? "Informe seu WhatsApp para iniciarmos o agendamento." 
                  : "Por favor, complete seus dados para continuarmos."}
              </p>
              
              {!telefoneVerificado ? (
                <div>
                  <label className="block text-xs font-bold text-foreground/70 mb-1.5">WhatsApp com DDD *</label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={e => handleInputChange('telefone', e.target.value)}
                    placeholder="(42) 99999-9999"
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary font-mono text-base font-bold tracking-widest shadow-inner"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        verificarTelefone();
                      }
                    }}
                    autoFocus
                  />
                  {errorWhatsApp && <p className="text-red-500 text-xs mt-1.5">{errorWhatsApp}</p>}
                  <Button type="button" variant="primary" className="mt-6 w-full font-bold" onClick={verificarTelefone}>
                    Continuar para Escolha do Profissional →
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5">WhatsApp</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={formData.telefone}
                        disabled
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground/70 cursor-not-allowed font-mono font-bold tracking-widest"
                      />
                      <Button type="button" variant="outline" onClick={() => setTelefoneVerificado(false)}>Alterar</Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5">Nome Completo *</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={e => handleInputChange('nome', e.target.value)}
                      placeholder="Seu nome completo"
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5">E-mail (opcional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => handleInputChange('email', e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button 
                      type="button" 
                      variant="primary" 
                      className="mt-6 w-full font-bold" 
                      onClick={() => {
                        if (!formData.nome) {
                          alert("Por favor, preencha o Nome Completo.");
                          return;
                        }
                        nextStep();
                      }}
                    >
                      Continuar para Escolha do Profissional →
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Passo 2: PROFISSIONAL PRIMEIRO */}
          {step === 'profissional' && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1.5 flex items-center gap-2">
                <UserCheck size={22} className="text-primary" /> Escolha o Profissional
              </h2>
              <p className="text-xs text-foreground/60 mb-6">
                Selecione quem você deseja que realize seu atendimento:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profissionais.map(prof => (
                  <div
                    key={prof.id}
                    onClick={() => {
                      handleInputChange('profissionalId', prof.id);
                      handleInputChange('servicoId', ''); // limpa serviço ao trocar de profissional
                      nextStep();
                    }}
                    className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 ${
                      formData.profissionalId === prof.id
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : 'border-[var(--border-subtle)] hover:border-primary/40 bg-[var(--background)]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {prof.foto_url ? (
                        <img 
                          src={prof.foto_url} 
                          alt={prof.nome} 
                          className="w-14 h-14 rounded-full object-cover border-2 border-primary/30 shrink-0" 
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                          {prof.nome.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-base truncate">{prof.nome}</h3>
                        <p className="text-xs text-foreground/60 mt-0.5 line-clamp-2">
                          {(prof.especialidades || ['Especialista']).join(' • ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border-subtle)]">
                <button type="button" onClick={prevStep} className="text-xs text-foreground/60 hover:text-foreground font-semibold">
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {/* Passo 3: SERVIÇOS FILTRADOS PELO PROFISSIONAL */}
          {step === 'servico' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Search size={20} className="text-primary" /> Procedimentos de {profissionalSelecionado?.nome || 'Salão'}
                </h2>
                <span className="text-xs text-primary font-mono bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                  {servicosDoProfissional.length} opções
                </span>
              </div>
              <p className="text-xs text-foreground/60 mb-6">
                Valores oficiais do Studio. Todos os serviços são &quot;a partir de&quot; conforme comprimento e necessidade.
              </p>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {servicosDoProfissional.map(servico => {
                  const isServicoNoiva = servico.categoria === 'Noivas' || servico.nome.toLowerCase().includes('noiva');
                  const isSelected = formData.servicoId === servico.id;

                  return (
                    <div
                      key={servico.id}
                      onClick={() => {
                        handleInputChange('servicoId', servico.id);
                        nextStep();
                      }}
                      className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 flex justify-between items-center gap-4 ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                          : 'border-[var(--border-subtle)] hover:border-primary/40 bg-[var(--background)]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                          {isServicoNoiva && <Crown size={16} className="text-amber-500 shrink-0" />}
                          <span className="truncate">{servico.nome}</span>
                        </h3>
                        <span className="text-[11px] text-foreground/50 block mt-0.5">{servico.categoria}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-primary text-base">
                          R$ {Number(servico.preco).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[11px] text-foreground/50 block">{servico.duracao_min} min</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border-subtle)]">
                <button type="button" onClick={prevStep} className="text-xs text-foreground/60 hover:text-foreground font-semibold">
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {/* Passo 4: DATA & HORÁRIO INTELIGENTE */}
          {step === 'data' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1">
                  <Calendar size={20} className="text-primary" /> Data e Horário Disponível
                </h2>
                <p className="text-xs text-foreground/60">
                  Profissional: <strong>{profissionalSelecionado?.nome}</strong> • Serviço: <strong>{servicoSelecionado?.nome}</strong>
                </p>
              </div>

              {/* Seletor de Datas */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-2">Escolha o Dia:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {datasDisponiveis.map(d => {
                    const isSelected = formData.data === d.value;
                    const indisponivel = !d.abertoSalao || !d.profAtende;

                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => !indisponivel && handleInputChange('data', d.value)}
                        disabled={indisponivel}
                        className={`p-3 text-center rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/15 text-primary font-bold shadow-md'
                            : indisponivel
                            ? 'border-transparent bg-foreground/5 text-foreground/30 cursor-not-allowed'
                            : 'border-[var(--border-subtle)] hover:border-primary/40 bg-[var(--background)] text-foreground font-medium'
                        }`}
                      >
                        <span className="block capitalize">{d.label.split(',')[0]}</span>
                        <span className="block font-bold text-sm mt-0.5">{d.label.split(',')[1] || d.value.slice(8)}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center gap-3">
                  <span className="text-xs text-foreground/60 font-bold">Ou escolha uma data futura no calendário:</span>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.data}
                    onChange={(e) => handleInputChange('data', e.target.value)}
                    className="w-full sm:w-auto bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Status do Salão vs Profissional */}
              {statusData && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  statusData.tipo === 'aberto'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}>
                  {statusData.tipo === 'aberto' ? <CheckCircle size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
                  <span>{statusData.texto}</span>
                </div>
              )}

              {/* Seletor de Horários */}
              {slotsHorarios.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-foreground/70 mb-2">Selecione o Horário:</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {slotsHorarios.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleInputChange('hora', h)}
                        className={`p-2.5 text-center rounded-lg border text-xs font-mono font-bold transition-all ${
                          formData.hora === h
                            ? 'border-primary bg-primary text-black shadow-md'
                            : 'border-[var(--border-subtle)] hover:border-primary/40 bg-[var(--background)] text-foreground'
                        }`}
                      >
                        <Clock size={12} className="inline mr-1 opacity-70" />
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">
                <button type="button" onClick={prevStep} className="text-xs text-foreground/60 hover:text-foreground font-semibold">
                  ← Voltar
                </button>
                <Button 
                  type="button" 
                  variant="primary" 
                  disabled={!formData.data || !formData.hora} 
                  onClick={nextStep}
                  className="font-bold"
                >
                  Revisar e Confirmar →
                </Button>
              </div>
            </div>
          )}

          {/* Passo 5: CONFIRMAÇÃO / RESUMO */}
          {step === 'confirmacao' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <CheckCircle size={22} className="text-primary" /> 
                {isNoiva ? 'Confirmar Reserva de Noiva' : 'Resumo do Agendamento'}
              </h2>

              {isNoiva && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Crown size={22} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-500 text-sm">
                        Exclusividade da Data — Sinal de 50%
                      </h4>
                      <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
                        Para bloquear sua data na agenda com Agnaldo Gomes, o sinal de 50% é gerado via PIX na próxima etapa.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm bg-[var(--background)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Cliente:</span>
                  <span className="font-bold text-foreground">{formData.nome}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">WhatsApp:</span>
                  <span className="font-mono text-foreground font-semibold">{formData.telefone}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Profissional:</span>
                  <span className="font-bold text-primary">{profissionalSelecionado?.nome}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Procedimento:</span>
                  <span className="font-bold text-foreground">{servicoSelecionado?.nome}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Data & Hora:</span>
                  <span className="font-bold text-foreground">{new Date(formData.data).toLocaleDateString('pt-BR')} às {formData.hora}</span>
                </div>
                <div className="flex justify-between py-1.5 text-base">
                  <span className="font-bold text-foreground">Valor:</span>
                  <span className="font-extrabold text-primary">R$ {valorTotalServico.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <div className="bg-primary/8 border border-primary/20 rounded-xl p-3 flex items-start gap-2 text-xs text-foreground/70">
                <MessageCircle size={16} className="shrink-0 mt-0.5 text-primary" />
                <p>Após confirmar, nossa secretaria poderá entrar em contato pelo seu WhatsApp para confirmar os detalhes.</p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">
                <button type="button" onClick={prevStep} className="text-xs text-foreground/60 hover:text-foreground font-semibold">
                  ← Voltar
                </button>
                <Button type="submit" variant="primary" className="font-bold">
                  {isNoiva ? 'Gerar PIX do Sinal de 50% →' : 'Enviar Solicitação pelo WhatsApp →'}
                </Button>
              </div>
            </div>
          )}

          {/* Passo Especial: Cobrança de Sinal PIX para Noivas */}
          {step === 'pagamento_noiva' && pixNoivaData && (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                <Crown size={36} className="text-amber-500 mx-auto mb-2" />
                <h2 className="text-xl font-bold text-foreground">Reserva Dia da Noiva Solicitada!</h2>
                <p className="text-xs text-foreground/70 mt-1">
                  Pague o sinal de 50% para garantir a exclusividade da sua data na agenda com Agnaldo Gomes.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/20 px-4 py-2 rounded-xl text-amber-500 font-extrabold text-lg">
                  Sinal: R$ {pixNoivaData.valorSinal.toFixed(2).replace('.', ',')}
                </div>
              </div>

              {/* QR Code */}
              {pixNoivaData.qrcodeBase64 && (
                <div className="flex flex-col items-center">
                  <img
                    src={`data:image/png;base64,${pixNoivaData.qrcodeBase64}`}
                    alt="QR Code PIX Noiva"
                    className="w-48 h-48 rounded-xl border border-[var(--border-subtle)] bg-white p-2 shadow-lg"
                  />
                  <p className="text-xs text-foreground/50 mt-2">Abra o app do seu banco e escaneie o código</p>
                </div>
              )}

              {/* Copia e Cola */}
              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold text-foreground/70">Código PIX Copia e Cola:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixNoivaData.pixCopiaCola}
                    className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs font-mono text-foreground select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 text-xs font-bold"
                    onClick={() => {
                      navigator.clipboard.writeText(pixNoivaData.pixCopiaCola);
                      setCopiadoPix(true);
                      setTimeout(() => setCopiadoPix(false), 2500);
                    }}
                  >
                    {copiadoPix ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copiadoPix ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
              </div>

              {/* Botão de Enviar Comprovante no WhatsApp */}
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <a
                  href={pixNoivaData.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all"
                >
                  <MessageCircle size={18} />
                  Enviar Comprovante do Sinal no WhatsApp
                </a>
              </div>
            </div>
          )}

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
