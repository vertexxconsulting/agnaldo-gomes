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
  Info,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/Button';
import { getServicos, getProfissionais, getProfissionalServico } from '@/lib/mock-data';
import type { Servico, Profissional, ProfissionalServico } from '@/lib/gestao-types';
import { obterHorariosSalao, DEFAULT_HORARIOS_SALAO } from '@/lib/ia-config';
import { normalizarTelefoneDestino } from '@/lib/whatsapp';

const DIAS_CHAVE = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export default function AgendamentoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicoParam = searchParams.get('servico');

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profServicos, setProfServicos] = useState<ProfissionalServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [agendamentoAtivo, setAgendamentoAtivo] = useState(true);
  const [whatsappSalao, setWhatsappSalao] = useState('5542998271222');
  
  // Ordem: telefone -> profissional -> servico -> confirmacao
  // (Step 'data' oculto: data/hora definida pela secretaria do salão)
  const [step, setStep] = useState<'telefone' | 'profissional' | 'servico' | 'data' | 'confirmacao' | 'pagamento_noiva'>('telefone');
  const [telefoneVerificado, setTelefoneVerificado] = useState(false);
  const [verificandoTelefone, setVerificandoTelefone] = useState(false);
  const [clienteReconhecido, setClienteReconhecido] = useState<string | null>(null);
  const [buscaServico, setBuscaServico] = useState('');
  const [catServicoFiltro, setCatServicoFiltro] = useState('todas');
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
    cpf: '',
    cep: '',
    endereco: '',
  });

  // Carregar dados
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const [sData, pData, psData] = await Promise.all([
        getServicos(),
        getProfissionais(),
        getProfissionalServico()
      ]);
      setServicos(sData);
      setProfissionais(pData.filter(p => p.ativo));
      setProfServicos(psData);

      // Se veio com servicoParam, tenta pré-selecionar o profissional vinculado
      if (servicoParam) {
        const vinculo = psData.find(ps => ps.servico_id === servicoParam);
        if (vinculo) {
          setFormData(prev => ({ ...prev, profissionalId: vinculo.profissional_id, servicoId: servicoParam }));
        }
      }

      try {
        const res = await fetch('/api/admin/loja/settings');
        if (res.ok) {
          const lojaData = await res.json();
          setAgendamentoAtivo(lojaData.agendamento_ativo ?? true);
          if (lojaData.whatsapp_contato && lojaData.whatsapp_contato.trim()) {
            setWhatsappSalao(lojaData.whatsapp_contato.trim());
          }
        }
      } catch (e) {
        console.error('Erro ao carregar configurações globais:', e);
      }

      setLoading(false);
    };
    carregarDados();
  }, [servicoParam]);

  // Step 'data' oculto para simplificar o fluxo (secretaria cuida disso)
  const steps: Array<'telefone' | 'profissional' | 'servico' | 'data' | 'confirmacao'> = [
    'telefone', 
    'profissional', 
    'servico', 
    'confirmacao'
  ];

  // Profissional selecionado
  const profissionalSelecionado = profissionais.find(p => p.id === formData.profissionalId);

  // Serviços filtrados estritamente pelo profissional selecionado (sem fallback geral)
  const servicosDoProfissional = useMemo(() => {
    if (!formData.profissionalId) return [];
    const idsVinculados = profServicos
      .filter(ps => ps.profissional_id === formData.profissionalId)
      .map(ps => ps.servico_id);

    // Retorna EXCLUSIVAMENTE os procedimentos que estão vinculados a este profissional
    if (idsVinculados.length > 0) {
      return servicos.filter(s => s.ativo && s.visivel_app && idsVinculados.includes(s.id));
    }
    // NUNCA retornar todos os procedimentos se não houver vínculo
    return [];
  }, [formData.profissionalId, profServicos, servicos]);

  const categoriasProfissional = useMemo(() => {
    const cats = new Set(servicosDoProfissional.map(s => s.categoria).filter(Boolean));
    return ['todas', ...Array.from(cats)];
  }, [servicosDoProfissional]);

  const servicosExibidos = useMemo(() => {
    return servicosDoProfissional.filter(s => {
      const matchCat = catServicoFiltro === 'todas' || s.categoria === catServicoFiltro;
      const matchBusca = !buscaServico.trim() ||
        s.nome.toLowerCase().includes(buscaServico.toLowerCase()) ||
        (s.categoria || '').toLowerCase().includes(buscaServico.toLowerCase());
      return matchCat && matchBusca;
    });
  }, [servicosDoProfissional, catServicoFiltro, buscaServico]);

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

  const verificarTelefone = async () => {
    const rawClean = (formData.telefone || '').replace(/\D/g, '');
    if (!rawClean || rawClean.length < 10) {
      setErrorWhatsApp('Digite um WhatsApp válido com DDD (Ex: 11 99999-9999)');
      return;
    }
    setErrorWhatsApp('');
    setVerificandoTelefone(true);

    try {
      const res = await fetch('/api/agendamento/verificar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: formData.telefone })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.found && data.cliente) {
          setFormData(prev => ({
            ...prev,
            clienteId: data.cliente.id,
            nome: data.cliente.nome,
            email: data.cliente.email || '',
            cpf: data.cliente.cpf || '',
            endereco: data.cliente.endereco || '',
          }));
          setClienteReconhecido(data.cliente.nome);
          setTelefoneVerificado(true);
          // Avança imediatamente para o passo do profissional
          nextStep();
          return;
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar cadastro por telefone:', err);
    } finally {
      setVerificandoTelefone(false);
    }

    // Não encontrado: libera formulário para novo cliente
    setClienteReconhecido(null);
    setTelefoneVerificado(true);
  };

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: `${data.logradouro}, , ${data.bairro}, ${data.localidade} - ${data.uf}`
        }));
      }
    } catch (e) {
      console.error('Erro ao buscar CEP', e);
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

    const isAgnaldo = profissionalSelecionado.nome.toLowerCase().includes('agnaldo') || profissionalSelecionado.id === 'agnaldo';
    const interval = isAgnaldo ? 20 : 30;

    const slots: string[] = [];
    for (let m = totalIni; m < totalFim; m += interval) {
      const hStr = String(Math.floor(m / 60)).padStart(2, '0');
      const minStr = String(m % 60).padStart(2, '0');
      slots.push(`${hStr}:${minStr}`);
    }

    return {
      slotsHorarios: slots,
      statusData: { tipo: 'aberto', texto: `Horário de atendimento: ${horaIni} às ${horaFim}` }
    };
  }, [formData.data, profissionalSelecionado]);

  const whatsappSalaoFormatado = useMemo(() => {
    return normalizarTelefoneDestino(whatsappSalao);
  }, [whatsappSalao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 'confirmacao') {
      nextStep();
      return;
    }

    setLoading(true);
    try {
      // Envia data fictícia de "hoje" e "00:00" para passar pela validação da API
      const hojeStr = new Date().toISOString().split('T')[0];
      const payload = {
        ...formData,
        data: formData.data || hojeStr,
        hora: formData.hora || '00:00'
      };

      const res = await fetch('/api/agendamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Erro ao processar agendamento no servidor');
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

      if (resData.whatsappUrl) {
        window.location.href = resData.whatsappUrl;
      } else {
        throw new Error('Link de envio para o WhatsApp não foi gerado');
      }
    } catch (err: any) {
      console.error('Erro no agendamento:', err);
      // Fallback de segurança: se a API retornar instabilidade, envia os dados diretamente para o WhatsApp do salão
      const destino = whatsappSalaoFormatado || '5542998271222';
      const msgTexto = `*Novo Agendamento Solicitado* 📅\n\n👤 *Cliente:* ${formData.nome || 'Cliente'}\n📞 *Telefone:* ${formData.telefone}\n✂️ *Serviço:* ${servicoSelecionado?.nome || 'Serviço'}\n👤 *Profissional:* ${profissionalSelecionado?.nome || 'Especialista'}\n💰 *Valor:* R$ ${valorTotalServico.toFixed(2).replace('.', ',')}\n\n🗓️ *Data/Hora:* A ser definida pela secretaria\n\n_Olá! Gostaria de agendar este procedimento no Studio Agnaldo Gomes._`;
      const fallbackUrl = `https://api.whatsapp.com/send?phone=${destino}&text=${encodeURIComponent(msgTexto)}`;

      const tentarDireto = confirm(`Aviso do agendamento: ${err.message || 'Houve uma instabilidade temporária'}.\n\nDeseja enviar sua solicitação diretamente para o WhatsApp do salão agora?`);
      if (tentarDireto) {
        window.location.href = fallbackUrl;
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gold/5 via-transparent to-gold/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground/70">Carregando horários e serviços do Studio...</p>
        </div>
      </div>
    );
  }

  if (!agendamentoAtivo && !loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl">
          <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-foreground mb-2">Agendamentos Desabilitados</h1>
          <p className="text-foreground/70 mb-6 leading-relaxed">
            Nossos agendamentos online estão temporariamente suspensos para manutenção ou atualização da nossa agenda.
          </p>
          <Button 
            variant="primary" 
            className="w-full font-bold flex items-center justify-center gap-2"
            onClick={() => window.open(`https://api.whatsapp.com/send?phone=${whatsappSalaoFormatado}&text=${encodeURIComponent('Olá, gostaria de saber sobre a disponibilidade de horários.')}`, '_blank')}
          >
            <MessageCircle size={18} />
            Falar pelo WhatsApp
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen py-8 lg:py-12 relative flex flex-col"
      style={{
        backgroundImage: 'url(/agnaldohero.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="max-w-5xl mx-auto px-4 w-full">
          
          {/* Header Centralizado acima das colunas */}
          <div className="text-center mb-8 lg:mb-10">
          <h1 className="text-3xl font-black text-foreground mb-2 flex flex-col items-center justify-center gap-2">
            {formData.nome && step !== 'telefone' && (
              <span className="text-xl font-bold text-gold tracking-tight">Olá, {formData.nome}!</span>
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
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${steps.indexOf(step as any) >= 0 ? 'bg-gold text-foreground' : 'bg-foreground/10 text-foreground/40'}`}>1</div>
                  <span><strong className="text-foreground">Identificação:</strong> Informe seu WhatsApp.</span>
                </li>
                <li className="flex gap-3">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${steps.indexOf(step as any) >= 1 ? 'bg-gold text-foreground' : 'bg-foreground/10 text-foreground/40'}`}>2</div>
                  <span><strong className="text-foreground">Profissional:</strong> Escolha quem irá lhe atender.</span>
                </li>
                <li className="flex gap-3">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${steps.indexOf(step as any) >= 2 ? 'bg-gold text-foreground' : 'bg-foreground/10 text-foreground/40'}`}>3</div>
                  <span><strong className="text-foreground">Serviço:</strong> Selecione o procedimento.</span>
                </li>
                <li className="flex gap-3">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${steps.indexOf(step as any) >= 3 ? 'bg-gold text-foreground' : 'bg-foreground/10 text-foreground/40'}`}>4</div>
                  <span><strong className="text-foreground">Data/Hora:</strong> Escolha o melhor momento.</span>
                </li>
                <li className="flex gap-3">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${steps.indexOf(step as any) >= 4 ? 'bg-gold text-foreground' : 'bg-foreground/10 text-foreground/40'}`}>5</div>
                  <span><strong className="text-foreground">Confirmação:</strong> Finalize seu agendamento!</span>
                </li>
              </ul>
              
              <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-xs text-foreground/50 flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5 text-gold" />
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
                          isActive ? 'bg-gold text-foreground ring-4 ring-primary/20' : isCompleted ? 'bg-gold text-foreground' : 'bg-foreground/10 text-foreground/40'
                        }`}>
                          {idx + 1}
                        </div>
                        {idx < steps.length - 1 && <div className={`w-8 sm:w-12 h-0.5 ${isCompleted ? 'bg-gold' : 'bg-foreground/10'}`} />}
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
                <Phone size={20} className="text-gold" /> Identificação
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
                    placeholder="(XX) XXXXX-XXXX"
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-gold font-mono text-base font-bold tracking-widest shadow-inner"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        verificarTelefone();
                      }
                    }}
                    autoFocus
                  />
                  {errorWhatsApp && <p className="text-red-500 text-xs mt-1.5">{errorWhatsApp}</p>}
                  <Button 
                    type="button" 
                    variant="primary" 
                    className="mt-6 w-full font-bold flex items-center justify-center gap-2" 
                    onClick={verificarTelefone}
                    disabled={verificandoTelefone}
                  >
                    {verificandoTelefone ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-foreground" />
                        Consultando cadastro...
                      </>
                    ) : (
                      'Continuar para Escolha do Profissional →'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clienteReconhecido ? (
                    <div className="md:col-span-2 p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center gap-3 text-xs text-emerald-400">
                      <UserCheck size={20} className="text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-bold text-foreground text-sm">Cadastro localizado!</p>
                        <p className="text-foreground/70">Bem-vindo(a) de volta, <strong>{clienteReconhecido}</strong>. Seus dados foram carregados.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="md:col-span-2 p-3 bg-gold/10 border border-gold/25 rounded-xl flex items-center gap-2 text-xs text-gold">
                      <Sparkles size={16} className="shrink-0" />
                      <span>Primeiro agendamento conosco! Complete seus dados abaixo para continuar.</span>
                    </div>
                  )}
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
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-gold"
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
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5">CPF (opcional para NF)</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={e => handleInputChange('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5">CEP (Busca Automática)</label>
                    <input
                      type="text"
                      value={formData.cep}
                      onChange={e => {
                        const val = e.target.value;
                        handleInputChange('cep', val);
                        if (val.replace(/\D/g, '').length === 8) {
                          buscarCep(val);
                        }
                      }}
                      placeholder="00000-000"
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5">Endereço Completo (opcional)</label>
                    <input
                      type="text"
                      value={formData.endereco}
                      onChange={e => handleInputChange('endereco', e.target.value)}
                      placeholder="Rua, Número, Bairro, CEP, Cidade"
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-gold"
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
                <UserCheck size={22} className="text-gold" /> Escolha o Profissional
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
                      setBuscaServico('');
                      setCatServicoFiltro('todas');
                      nextStep();
                    }}
                    className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 ${
                      formData.profissionalId === prof.id
                        ? 'border-gold bg-gold/10 ring-2 ring-primary/30'
                        : 'border-[var(--border-subtle)] hover:border-gold/40 bg-[var(--background)]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {prof.foto_url ? (
                        <img 
                          src={prof.foto_url} 
                          alt={prof.nome} 
                          className="w-14 h-14 rounded-full object-cover border-2 border-gold/30 shrink-0" 
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gold/15 text-gold flex items-center justify-center font-bold text-lg shrink-0">
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
                  <Search size={20} className="text-gold" /> Procedimentos de {profissionalSelecionado?.nome || 'Salão'}
                </h2>
                <span className="text-xs text-gold font-mono bg-gold/10 px-2.5 py-1 rounded-full border border-gold/20">
                  {servicosDoProfissional.length} {servicosDoProfissional.length === 1 ? 'opção' : 'opções'}
                </span>
              </div>
              <p className="text-xs text-foreground/60 mb-4">
                Procedimentos realizados exclusivamente por {profissionalSelecionado?.nome || 'este profissional'}. Todos os valores são &quot;a partir de&quot;.
              </p>

              {/* Se o profissional não tiver procedimentos atrelados */}
              {servicosDoProfissional.length === 0 ? (
                <div className="p-8 border border-dashed border-[var(--border-subtle)] rounded-2xl text-center space-y-3 bg-foreground/[0.02] my-4">
                  <AlertTriangle size={36} className="mx-auto text-amber-400" />
                  <h3 className="text-base font-bold text-foreground">
                    Nenhum procedimento disponível para {profissionalSelecionado?.nome || 'este profissional'}
                  </h3>
                  <p className="text-xs text-foreground/60 max-w-md mx-auto">
                    Este profissional não possui procedimentos vinculados para agendamento online no momento. Por favor, volte e escolha outro profissional da equipe.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="px-4 py-2 text-xs font-semibold rounded-lg border border-gold/40 text-gold hover:bg-gold/10 transition-colors"
                    >
                      ← Escolher outro profissional
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Busca e Filtro de Categorias */}
                  <div className="space-y-2.5 mb-4">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                      <input
                        type="text"
                        placeholder="Buscar procedimento por nome..."
                        value={buscaServico}
                        onChange={(e) => setBuscaServico(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-gold placeholder:text-foreground/40"
                      />
                    </div>

                    {categoriasProfissional.length > 2 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {categoriasProfissional.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCatServicoFiltro(cat)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                              catServicoFiltro === cat
                                ? 'bg-gold/15 border-gold/40 text-gold font-bold'
                                : 'border-[var(--border-subtle)] text-foreground/60 hover:text-foreground'
                            }`}
                          >
                            {cat === 'todas' ? 'Todos' : cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {servicosExibidos.length === 0 ? (
                    <div className="p-6 border border-dashed border-[var(--border-subtle)] rounded-xl text-center text-xs text-foreground/50 my-4">
                      Nenhum procedimento encontrado para &quot;{buscaServico}&quot;.
                      <button
                        type="button"
                        onClick={() => { setBuscaServico(''); setCatServicoFiltro('todas'); }}
                        className="block mx-auto text-gold font-semibold mt-2 hover:underline"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                      {servicosExibidos.map(servico => {
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
                                ? 'border-gold bg-gold/10 ring-2 ring-primary/20'
                                : 'border-[var(--border-subtle)] hover:border-gold/40 bg-[var(--background)]'
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
                              <span className="font-bold text-gold text-base text-right max-w-[120px] leading-tight block">
                                {servico.preco_variavel 
                                  ? (servico.preco_maximo 
                                      ? `R$ ${Number(servico.preco).toFixed(2).replace('.', ',')} a R$ ${Number(servico.preco_maximo).toFixed(2).replace('.', ',')}` 
                                      : `A partir de R$ ${Number(servico.preco).toFixed(2).replace('.', ',')}`)
                                  : `R$ ${Number(servico.preco).toFixed(2).replace('.', ',')}`}
                              </span>
                              <span className="text-[11px] text-foreground/50 block">{servico.duracao_min} min</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

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
                  <Calendar size={20} className="text-gold" /> Data e Horário Disponível
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
                            ? 'border-gold bg-gold/15 text-gold font-bold shadow-md'
                            : indisponivel
                            ? 'border-transparent bg-foreground/5 text-foreground/30 cursor-not-allowed'
                            : 'border-[var(--border-subtle)] hover:border-gold/40 bg-[var(--background)] text-foreground font-medium'
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
                    className="w-full sm:w-auto bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-gold cursor-pointer"
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
                            ? 'border-gold bg-gold text-foreground shadow-md'
                            : 'border-[var(--border-subtle)] hover:border-gold/40 bg-[var(--background)] text-foreground'
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
                <CheckCircle size={22} className="text-gold" /> 
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
                  <span className="font-bold text-gold">{profissionalSelecionado?.nome}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Procedimento:</span>
                  <span className="font-bold text-foreground">{servicoSelecionado?.nome}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-foreground/60">Data & Hora:</span>
                  <span className="font-semibold text-amber-600 text-xs text-right leading-tight">A definir pela secretaria</span>
                </div>
                <div className="flex justify-between py-1.5 text-base">
                  <span className="font-bold text-foreground">Valor:</span>
                  <span className="font-extrabold text-gold text-right">
                    {servicoSelecionado?.preco_variavel
                      ? (servicoSelecionado.preco_maximo 
                          ? `R$ ${valorTotalServico.toFixed(2).replace('.', ',')} a R$ ${Number(servicoSelecionado.preco_maximo).toFixed(2).replace('.', ',')}` 
                          : `A partir de R$ ${valorTotalServico.toFixed(2).replace('.', ',')}`)
                      : `R$ ${valorTotalServico.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
              </div>

              <div className="bg-gold/8 border border-gold/20 rounded-xl p-3 flex items-start gap-2 text-xs text-foreground/70">
                <MessageCircle size={16} className="shrink-0 mt-0.5 text-gold" />
                <p>Após confirmar, nossa secretaria entrará em contato pelo seu WhatsApp para definir a melhor data e horário disponível para você.</p>
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
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-foreground font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all"
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
    </div>
  );
}
