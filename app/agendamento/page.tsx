'use client';

import { useState } from 'react';
import { Button } from "@/components/Button";
import { CheckCircle2, ChevronRight, ChevronLeft, CalendarDays, Clock, User, Scissors, Camera, Upload, LogIn } from "lucide-react";
import { MOCK_CLIENTES, MOCK_SERVICOS, MOCK_PROFISSIONAIS, getCategorias, getProfissionaisPorServico } from '@/lib/mock-data';
import type { Cliente } from '@/lib/gestao-types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';

export function gerarId() {
  return `ag${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export default function AgendamentoWizard() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [telefoneBusca, setTelefoneBusca] = useState('');
  const [cliente, setCliente] = useState<Partial<Cliente> | null>(null);
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  
  const [servicoId, setServicoId] = useState<string>('');
  const [profissionalId, setProfissionalId] = useState<string>('');
  const [dataAgendamento, setDataAgendamento] = useState<string>('');
  const [horaAgendamento, setHoraAgendamento] = useState<string>('');
  
  const [aceiteLGPD, setAceiteLGPD] = useState(false);

  // Helper mock data
  const categorias = getCategorias();
  const servicosAtivos = MOCK_SERVICOS.filter(s => s.ativo && s.visivel_app);
  const profsPossiveis = servicoId ? getProfissionaisPorServico(servicoId) : [];
  
  const HORARIOS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const hoje = new Date().toISOString().split('T')[0];

  const handleBuscarCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (telefoneBusca.length < 10) return;
    
    const c = MOCK_CLIENTES.find(c => c.telefone.replace(/\D/g, '') === telefoneBusca.replace(/\D/g, ''));
    if (c) {
      setCliente(c);
      setAceiteLGPD(true);
      setStep(3);
    } else {
      setCliente({ telefone: telefoneBusca });
      setStep(2);
    }
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFotoLocal(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCadastro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente?.nome || !aceiteLGPD) return;
    setStep(3);
  };

  const handleServico = (id: string) => {
    setServicoId(id);
    const profs = getProfissionaisPorServico(id);
    if (profs.length === 1) {
      setProfissionalId(profs[0].id);
      setStep(5);
    } else {
      setProfissionalId('');
      setStep(4);
    }
  };

  const handleProfissional = (id: string) => {
    setProfissionalId(id);
    setStep(5);
  };

  const handleDataHora = (e: React.FormEvent) => {
    e.preventDefault();
    if (dataAgendamento && horaAgendamento) {
      setStep(6);
    }
  };

  const handleConfirmar = () => {
    const novoAgendamento = {
      id: gerarId(),
      cliente_id: cliente?.id || `c_novo_${Date.now()}`,
      profissional_id: profissionalId,
      servico_id: servicoId,
      data: dataAgendamento,
      hora_inicio: horaAgendamento,
      hora_fim: 'Calculado depois',
      status: 'pendente',
      canal: 'online',
      criado_em: new Date().toISOString()
    };
    
    const atuais = JSON.parse(localStorage.getItem('agendamentos_app') ?? '[]');
    localStorage.setItem('agendamentos_app', JSON.stringify([...atuais, novoAgendamento]));
    
    if (!cliente?.id) {
     const telefoneLogado = cliente?.telefone ?? '';
      localStorage.setItem('telefone_logado', telefoneLogado);
    } else {
       localStorage.setItem('telefone_logado', cliente.telefone ?? '');
    }
    setStep(7);
  };

  // Motion variants for sleek clerk-like transitions
  const variants: Variants = {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-[#FAFAFA] text-foreground p-4 sm:p-6 relative overflow-hidden">
      
      {/* Decoração de Fundo (opcional, bem sutil) */}
      <div className="absolute top-0 w-full h-1/3 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      {/* Container Principal */}
      <div className="w-full max-w-[400px] z-10">
        
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image 
            src="/opt/logo-branca.webp" 
            alt="Logo Studio" 
            width={120} 
            height={40} 
            className="object-contain drop-shadow-sm opacity-90"
          />
        </div>

        {/* Card Motion */}
        <motion.div 
          layout
          initial={{ borderRadius: 16 }}
          className="bg-white border border-[var(--border-subtle)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative"
        >
          
          {/* Barra de progresso subtil no topo (Clerk style loaders) */}
          {step < 7 && (
            <div className="absolute top-0 left-0 h-[2px] bg-primary transition-all duration-500 ease-out z-20" style={{ width: `${((step - 1) / 6) * 100}%` }} />
          )}

          <AnimatePresence mode="wait">
            {/* ----------------- PASSO 1: IDENTIFICAÇÃO ----------------- */}
            {step === 1 && (
              <motion.div key="step1" variants={variants} initial="initial" animate="animate" exit="exit" className="p-8">
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold mb-1.5 text-foreground">Acessar Agendamento</h1>
                  <p className="text-sm text-foreground/50">Insira seu WhatsApp para continuar</p>
                </div>
                
                <form onSubmit={handleBuscarCliente} className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-foreground/70 mb-1.5">Telefone</label>
                    <input 
                      type="tel" 
                      autoFocus
                      required
                      placeholder="(42) 99999-9999"
                      value={telefoneBusca}
                      onChange={e => setTelefoneBusca(e.target.value)}
                      className="w-full bg-white border border-[var(--border-subtle)] rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all" 
                    />
                  </div>
                  <Button type="submit" variant="primary" className="w-full font-semibold rounded-lg py-2.5 mt-2">
                    Continuar
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ----------------- PASSO 2: CADASTRO RÁPIDO ----------------- */}
            {step === 2 && (
              <motion.div key="step2" variants={variants} initial="initial" animate="animate" exit="exit" className="p-8">
                <button onClick={() => setStep(1)} className="text-foreground/40 hover:text-foreground text-[13px] font-medium flex items-center gap-1 mb-5 transition-colors">
                  <ChevronLeft size={14}/> Voltar
                </button>
                
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold mb-1.5 text-foreground">Criar Perfil</h1>
                  <p className="text-sm text-foreground/50">Precisamos de alguns dados rápidos</p>
                </div>
                
                <form onSubmit={handleCadastro} className="space-y-4">
                  {/* Foto Clerk Style */}
                  <div className="flex justify-center mb-2">
                    <label className="relative group cursor-pointer block w-16 h-16">
                      <div className="w-full h-full rounded-full border border-[var(--border-subtle)] bg-[#FAFAFA] flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:border-primary">
                        {fotoLocal ? (
                          <Image src={fotoLocal} alt="Preview" fill className="object-cover" />
                        ) : (
                          <Camera size={20} className="text-foreground/30 group-hover:text-primary transition-colors" />
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-foreground/70 mb-1.5">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Maria Silva"
                      value={cliente?.nome || ''}
                      onChange={e => setCliente({...cliente, nome: e.target.value})}
                      className="w-full bg-white border border-[var(--border-subtle)] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-semibold text-foreground/70 mb-1.5">E-mail (Opcional)</label>
                    <input 
                      type="email"
                      placeholder="seu@email.com"
                      value={cliente?.email || ''}
                      onChange={e => setCliente({...cliente, email: e.target.value})}
                      className="w-full bg-white border border-[var(--border-subtle)] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all" 
                    />
                  </div>

                  <div className="flex items-start gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="lgpd" 
                      required 
                      checked={aceiteLGPD}
                      onChange={e => setAceiteLGPD(e.target.checked)}
                      className="mt-1 flex-shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="lgpd" className="text-[12px] text-foreground/60 leading-snug">
                      Aceito os termos da LGPD para armazenamento de dados visando o agendamento.
                    </label>
                  </div>

                  <Button type="submit" variant="primary" className="w-full font-semibold rounded-lg py-2.5 mt-2" disabled={!aceiteLGPD}>
                    Salvar e Continuar
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ----------------- PASSO 3: SERVIÇOS ----------------- */}
            {step === 3 && (
              <motion.div key="step3" variants={variants} initial="initial" animate="animate" exit="exit" className="flex flex-col h-[500px]">
                <div className="p-6 pb-4 border-b border-[var(--border-subtle)] bg-white/50 backdrop-blur-sm z-10 sticky top-0 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-lg font-bold text-foreground">Escolher Serviço</h1>
                      <p className="text-[13px] text-foreground/50">Olá, {cliente?.nome?.split(' ')[0]}!</p>
                    </div>
                    <button onClick={() => setStep(1)} className="text-[11px] font-semibold text-foreground/40 hover:text-primary transition-colors bg-foreground/5 px-2 py-1 rounded-full">Sair</button>
                  </div>
                </div>

                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                  {categorias.map(cat => {
                    const servicosDaCat = servicosAtivos.filter(s => s.categoria === cat);
                    if (servicosDaCat.length === 0) return null;
                    
                    return (
                      <div key={cat}>
                        <h3 className="text-[11px] font-bold tracking-wider uppercase text-foreground/40 mb-2 pl-2">{cat}</h3>
                        <div className="flex flex-col gap-1.5">
                          {servicosDaCat.map(s => (
                            <div 
                              key={s.id} 
                              onClick={() => handleServico(s.id)}
                              className="group bg-white border border-[var(--border-subtle)] hover:border-primary/50 p-3.5 rounded-xl cursor-pointer transition-all hover:shadow-md flex justify-between items-center"
                            >
                              <div>
                                <span className="font-semibold text-[14px] text-foreground block mb-0.5">{s.nome}</span>
                                <span className="text-[12px] text-foreground/50 flex items-center gap-1">
                                  <Clock size={12}/> {s.duracao_min} min
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[13px] font-bold text-primary">R$ {s.preco}</span>
                                <ChevronRight size={16} className="text-foreground/20 group-hover:text-primary transition-colors"/>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ----------------- PASSO 4: PROFISSIONAL ----------------- */}
            {step === 4 && (
              <motion.div key="step4" variants={variants} initial="initial" animate="animate" exit="exit" className="p-6">
                <button onClick={() => setStep(3)} className="text-foreground/40 hover:text-foreground text-[13px] font-medium flex items-center gap-1 mb-5 transition-colors">
                  <ChevronLeft size={14}/> Voltar
                </button>
                
                <div className="mb-5">
                  <h1 className="text-lg font-bold text-foreground mb-1">Profissional</h1>
                  <p className="text-[13px] text-foreground/50">Quem vai realizar o serviço?</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div 
                    onClick={() => handleProfissional('qualquer')}
                    className="group bg-white border border-[var(--border-subtle)] hover:border-primary/50 p-3 rounded-xl cursor-pointer transition-all hover:shadow-md flex items-center gap-3"
                  >
                     <div className="w-10 h-10 rounded-full bg-[#FAFAFA] border border-[var(--border-subtle)] flex items-center justify-center text-foreground/40 group-hover:text-primary transition-colors font-bold text-sm">
                       ?
                     </div>
                     <div className="flex-1">
                       <p className="font-semibold text-[14px] text-foreground">Qualquer especialista</p>
                       <p className="text-[12px] text-foreground/40">O primeiro disponível</p>
                     </div>
                     <ChevronRight size={16} className="text-foreground/20 group-hover:text-primary transition-colors"/>
                  </div>

                  {profsPossiveis.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => handleProfissional(p.id)}
                      className="group bg-white border border-[var(--border-subtle)] hover:border-primary/50 p-3 rounded-xl cursor-pointer transition-all hover:shadow-md flex items-center gap-3"
                    >
                       <div className="w-10 h-10 rounded-full bg-[#FAFAFA] border border-[var(--border-subtle)] overflow-hidden relative">
                         {p.foto_url ? (
                           <Image src={p.foto_url} alt={p.nome} fill className="object-cover" />
                         ) : (
                           <User size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground/30" />
                         )}
                       </div>
                       <div className="flex-1">
                         <p className="font-semibold text-[14px] text-foreground">{p.nome}</p>
                       </div>
                       <ChevronRight size={16} className="text-foreground/20 group-hover:text-primary transition-colors"/>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ----------------- PASSO 5: DATA E HORA ----------------- */}
            {step === 5 && (
              <motion.div key="step5" variants={variants} initial="initial" animate="animate" exit="exit" className="p-6">
                <button onClick={() => setStep(profsPossiveis.length > 1 ? 4 : 3)} className="text-foreground/40 hover:text-foreground text-[13px] font-medium flex items-center gap-1 mb-5 transition-colors">
                  <ChevronLeft size={14}/> Voltar
                </button>
                
                <div className="mb-5">
                  <h1 className="text-lg font-bold text-foreground mb-1">Data e Hora</h1>
                  <p className="text-[13px] text-foreground/50">Selecione o melhor momento</p>
                </div>
                
                <form onSubmit={handleDataHora} className="space-y-5">
                  <div>
                    <label className="block text-[12px] font-semibold text-foreground/60 mb-2 uppercase tracking-wide">Dia</label>
                    <input 
                      type="date" 
                      required 
                      min={hoje} 
                      value={dataAgendamento} 
                      onChange={(e) => setDataAgendamento(e.target.value)}
                      className="w-full bg-white border border-[var(--border-subtle)] rounded-lg px-3.5 py-2.5 text-[14px] text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" 
                    />
                  </div>
                  
                  {dataAgendamento && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                      <label className="block text-[12px] font-semibold text-foreground/60 mb-2 uppercase tracking-wide">Horários Livres</label>
                      <div className="grid grid-cols-4 gap-2">
                        {HORARIOS.map((h) => (
                          <div 
                            key={h} 
                            onClick={() => setHoraAgendamento(h)}
                            className={`border rounded-lg py-2 text-center cursor-pointer transition-all text-[13px] font-semibold ${
                              horaAgendamento === h 
                              ? 'border-primary bg-primary text-primary-foreground shadow-sm scale-[1.02]' 
                              : 'border-[var(--border-subtle)] bg-white text-foreground hover:border-primary/50 hover:bg-[#FAFAFA]'
                            }`}
                          >
                            {h}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="pt-2">
                    <Button type="submit" variant="primary" className="w-full font-semibold rounded-lg py-2.5" disabled={!dataAgendamento || !horaAgendamento}>
                      Continuar
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ----------------- PASSO 6: RESUMO ----------------- */}
            {step === 6 && (
              <motion.div key="step6" variants={variants} initial="initial" animate="animate" exit="exit" className="p-6">
                <button onClick={() => setStep(5)} className="text-foreground/40 hover:text-foreground text-[13px] font-medium flex items-center gap-1 mb-5 transition-colors">
                  <ChevronLeft size={14}/> Voltar
                </button>
                
                <div className="mb-5 text-center">
                  <h1 className="text-xl font-bold text-foreground mb-1">Tudo certo?</h1>
                  <p className="text-[13px] text-foreground/50">Confira antes de finalizar</p>
                </div>
                
                <div className="bg-[#FAFAFA] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4 mb-6">
                  <div className="flex justify-between items-center pb-4 border-b border-[var(--border-subtle)]">
                    <div>
                      <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Serviço</p>
                      <p className="font-semibold text-[14px] text-foreground">{servicosAtivos.find(s=>s.id===servicoId)?.nome}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">R$ {servicosAtivos.find(s=>s.id===servicoId)?.preco}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Data e Hora</p>
                      <p className="font-medium text-[13px] text-foreground">{dataAgendamento.split('-').reverse().join('/')} às {horaAgendamento}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Profissional</p>
                      <p className="font-medium text-[13px] text-foreground truncate">
                        {profissionalId === 'qualquer' ? 'Qualquer Especialista' : MOCK_PROFISSIONAIS.find(p=>p.id===profissionalId)?.nome}
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleConfirmar} variant="primary" className="w-full font-bold rounded-lg py-3 shadow-[0_4px_14px_0_var(--color-primary-transparent)] hover:shadow-[0_6px_20px_rgba(202,154,63,0.23)]">
                  Confirmar Agendamento
                </Button>
              </motion.div>
            )}

            {/* ----------------- PASSO 7: SUCESSO ----------------- */}
            {step === 7 && (
              <motion.div key="step7" variants={variants} initial="initial" animate="animate" exit="exit" className="p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-5">
                  <CheckCircle2 size={32} strokeWidth={2.5}/>
                </div>
                
                <h1 className="text-xl font-bold text-foreground mb-2">Agendado!</h1>
                <p className="text-[14px] text-foreground/60 mb-8 leading-relaxed">
                  Te esperamos no dia <strong>{dataAgendamento.split('-').reverse().join('/')}</strong> às <strong>{horaAgendamento}</strong>. Enviamos a confirmação no seu WhatsApp.
                </p>
                
                <div className="w-full space-y-2">
                  <Button variant="primary" onClick={() => router.push('/perfil')} className="w-full font-semibold rounded-lg py-2.5">
                    Ver Meus Agendamentos
                  </Button>
                  <Button variant="outline" onClick={() => { setStep(3); setDataAgendamento(''); setHoraAgendamento(''); }} className="w-full font-medium text-[13px] rounded-lg py-2.5">
                    Agendar Outro
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
        
        {/* Footer info (Clerk style footer) */}
        <div className="text-center mt-6">
          <p className="text-[11px] text-foreground/30 flex items-center justify-center gap-1">
            Protegido e de acordo com a LGPD
          </p>
        </div>

      </div>
    </div>
  );
}