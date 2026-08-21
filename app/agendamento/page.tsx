'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Clock, User, CheckCircle, X, Search, Phone } from 'lucide-react';
import { Button } from '@/components/Button';
import { getServicos, getProfissionais, getClientes, getProfissionalServico } from '@/lib/mock-data';
import type { Servico, Profissional, Cliente } from '@/lib/mock-data';

export default function AgendamentoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicoParam = searchParams.get('servico');

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicosRelacionados, setServicosRelacionados] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'telefone' | 'servico' | 'profissional' | 'data' | 'confirmacao'>('telefone');
  const [telefoneVerificado, setTelefoneVerificado] = useState(false);
  const [errorWhatsApp, setErrorWhatsApp] = useState('');
  const [formData, setFormData] = useState({
    servicoId: servicoParam || '',
    profissionalId: '',
    clienteId: '',
    data: '',
    hora: '',
    nome: '',
    telefone: '',
    email: '',
  });

  // Carregar dados do Supabase (com fallback para mock)
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
      setProfissionais(pData);
      setClientes(cData);

      // Mapeia profissionais por serviço
      const map: Record<string, string[]> = {};
      psData.forEach(ps => {
        if (!map[ps.servico_id]) map[ps.servico_id] = [];
        map[ps.servico_id].push(ps.profissional_id);
      });
      setServicosRelacionados(map);
      setLoading(false);
    };
    carregarDados();
  }, []);

  // Derived: serviços ativos visíveis no app
  const servicosAtivos = servicos.filter(s => s.ativo && s.visivel_app);

  // Derived: profissionais ativos
  const profissionaisAtivos = profissionais.filter(p => p.ativo);

  // Derived: profissionais ativos para o serviço selecionado
  const profissionaisDoServico = servicosRelacionados[formData.servicoId]?.map(pid =>
    profissionais.find(p => p.id === pid)
  ).filter(Boolean) || [];

  // Derived: serviço selecionado
  const servicoSelecionado = servicos.find(s => s.id === formData.servicoId);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const steps: Array<'telefone' | 'servico' | 'profissional' | 'data' | 'confirmacao'> = ['telefone', 'servico', 'profissional', 'data', 'confirmacao'];

  const verificarTelefone = () => {
    if (!formData.telefone || formData.telefone.length < 10) {
      setErrorWhatsApp('Digite um WhatsApp válido');
      return;
    }
    setErrorWhatsApp('');
    
    // Normalizar telefone para busca:
    const numLimpo = formData.telefone.replace(/\D/g, '');
    
    // Buscar no mock
    const clienteExistente = clientes.find(c => (c.telefone || '').replace(/\D/g, '') === numLimpo);
    
    if (clienteExistente) {
      setFormData(prev => ({
        ...prev,
        nome: clienteExistente.nome,
        email: clienteExistente.email || '',
        clienteId: clienteExistente.id
      }));
      // Já está cadastrado, segue direto pro próximo passo
      nextStep();
    } else {
      // Não cadastrado, mostra os campos Nome e Email
      setTelefoneVerificado(true);
    }
  };

  const nextStep = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 'confirmacao') {
      nextStep();
      return;
    }

    setLoading(true);
    try {
      // 1. Persistir no CRM Interno (Supabase) via API Route
      const res = await fetch('/api/agendamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao salvar agendamento');
      }

      const { whatsappUrl } = await res.json();

      // 2. Redirecionar para o WhatsApp do Studio com a trava de confirmação
      // Usamos window.location.href para garantir o redirecionamento externo
      window.location.href = whatsappUrl;
    } catch (err: any) {
      console.error('Erro no agendamento:', err);
      alert(`Erro: ${err.message || 'Ocorreu um erro ao processar seu agendamento. Tente novamente.'}`);
      setLoading(false);
    }
  };

  // Derived: horas disponíveis
  const horasDisponiveis = Array.from({ length: 12 }, (_, i) => {
    const h = 8 + i;
    return `${String(h).padStart(2, '0')}:00`;
  });

  // Derived: datas disponíveis (7 dias a partir de hoje)
  const datasDisponiveis = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-transparent to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-foreground/70">Carregando serviços e profissionais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-transparent to-primary/5 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground mb-2">Agende seu Horário</h1>
          <p className="text-foreground/60">Preencha os dados e confirme seu agendamento</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            {steps.map((s, idx) => {
              const isActive = s === step;
              const isCompleted = steps.indexOf(step) > idx;
              return (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isActive ? 'bg-primary text-black' : isCompleted ? 'bg-primary text-black' : 'bg-foreground/20 text-foreground/50'
                  }`}>
                    {idx + 1}
                  </div>
                  {idx < steps.length - 1 && <div className={`w-12 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-foreground/20'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-8">

          {/* Step 1: Identificação */}
          {step === 'telefone' && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2"><Phone size={20} /> Identificação</h2>
              <p className="text-sm text-foreground/60 mb-6">
                {!telefoneVerificado 
                  ? "Informe seu WhatsApp para começar o agendamento." 
                  : "Não encontramos seu cadastro. Por favor, preencha os dados abaixo para continuar."}
              </p>
              
              {!telefoneVerificado ? (
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Telefone (WhatsApp) *</label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={e => handleInputChange('telefone', e.target.value)}
                    placeholder="(42) 99999-9999"
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        verificarTelefone();
                      }
                    }}
                    autoFocus
                  />
                  {errorWhatsApp && <p className="text-red-500 text-xs mt-1">{errorWhatsApp}</p>}
                  <Button type="button" variant="primary" className="mt-6 w-full" onClick={verificarTelefone}>Continuar →</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Telefone (WhatsApp)</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={formData.telefone}
                        disabled
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground/50 cursor-not-allowed"
                      />
                      <Button type="button" variant="outline" onClick={() => setTelefoneVerificado(false)}>Alterar</Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Nome Completo *</label>
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
                    <label className="block text-sm font-medium text-foreground/70 mb-1">E-mail (opcional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => handleInputChange('email', e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="button" variant="primary" className="mt-6 w-full" onClick={() => {
                      if (!formData.nome) {
                        alert("Por favor, preencha o Nome Completo.");
                        return;
                      }
                      nextStep();
                    }}>Continuar →</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Serviço */}
          {step === 'servico' && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Search size={20} /> Escolha o Serviço</h2>
              <div className="space-y-3">
                {servicosAtivos.map(servico => (
                  <div
                    key={servico.id}
                    onClick={() => {
                      handleInputChange('servicoId', servico.id);
                      nextStep();
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.servicoId === servico.id
                        ? 'border-primary bg-primary/10'
                        : 'border-[var(--border-subtle)] hover:border-primary/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-foreground">{servico.nome}</h3>
                      <div className="text-right">
                        <span className="font-bold text-primary">R$ {Number(servico.preco).toFixed(2).replace('.', ',')}</span>
                        <span className="text-xs text-foreground/50 block">{servico.duracao_min} min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={prevStep} className="text-sm text-foreground/60 hover:text-foreground mt-4">← Voltar</button>
            </div>
          )}

          {/* Step 2: Profissional */}
          {step === 'profissional' && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><User size={20} /> Escolha o Profissional</h2>
              <div className="space-y-3">
                {((profissionaisDoServico.filter(Boolean).length > 0
                  ? profissionaisDoServico.filter(Boolean) as Profissional[]
                  : profissionaisAtivos) || []).map(prof => (
                  <div
                    key={prof.id}
                    onClick={() => {
                      handleInputChange('profissionalId', prof.id);
                      nextStep();
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.profissionalId === prof.id
                        ? 'border-primary bg-primary/10'
                        : 'border-[var(--border-subtle)] hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {prof.nome.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground">{prof.nome}</h3>
                        <p className="text-sm text-foreground/60">{(prof.especialidades || ['Especialista']).join(', ')}</p>
                      </div>
                      <CheckCircle size={20} className={prof.ativo ? 'text-green-500' : 'text-foreground/30'} />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={prevStep} className="text-sm text-foreground/60 hover:text-foreground mt-4">
                ← Voltar
              </button>
            </div>
          )}



          {/* Step 4: Data/Hora */}
          {step === 'data' && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><Calendar size={20} /> Escolha a Data e Hora</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-2">Data</label>
                  <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                    {datasDisponiveis.map(d => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => handleInputChange('data', d.value)}
                        className={`p-3 text-center rounded-lg border text-sm transition-all ${
                          formData.data === d.value
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-[var(--border-subtle)] hover:border-primary/50'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-2">Hora</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {horasDisponiveis.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleInputChange('hora', h)}
                        className={`p-3 text-center rounded-lg border text-sm transition-all ${
                          formData.hora === h
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-[var(--border-subtle)] hover:border-primary/50'
                        }`}
                      >
                        <Clock size={14} className="inline mr-1" />
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="button" onClick={prevStep} className="text-sm text-foreground/60 hover:text-foreground mt-4">
                ← Voltar
              </button>
            </div>
          )}

          {/* Step 5: Confirmação */}
          {step === 'confirmacao' && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><CheckCircle size={20} /> Confirme o Agendamento</h2>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Cliente</span>
                  <span className="font-bold text-foreground">{formData.nome}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Telefone</span>
                  <span className="font-bold text-foreground">{formData.telefone}</span>
                </div>
                {formData.email && (
                  <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]">
                    <span className="text-foreground/60">E-mail</span>
                    <span className="font-bold text-foreground">{formData.email}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Serviço</span>
                  <span className="font-bold text-foreground">{servicoSelecionado?.nome || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Profissional</span>
                  <span className="font-bold text-foreground">{profissionais.find(p => p.id === formData.profissionalId)?.nome || 'Qualquer Especialista'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Data e Hora</span>
                  <span className="font-bold text-foreground">{formData.data} às {formData.hora}</span>
                </div>
                <div className="flex justify-between py-4 text-lg">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="font-black text-primary text-xl">R$ {Number(servicoSelecionado?.preco).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                  <X size={18} className="mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  Confirmar e Finalizar
                </Button>
              </div>
            </div>
          )}

          {/* Navigation button for data step */}
          {step === 'data' && formData.data && formData.hora && (
            <Button type="button" variant="primary" className="mt-4 w-full" onClick={nextStep}>
              Continuar →
            </Button>
          )}
        </form>

        {/* Disclaimer */}
        <p className="text-xs text-foreground/40 text-center mt-6">
          Ao confirmar, você concorda com nossos termos de serviço.
        </p>
      </div>
    </div>
  );
}
