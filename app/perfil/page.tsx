'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/Button";
import { CardGlass } from "@/components/CardGlass";
import { LogOut, Calendar, Clock, User, Camera, Trash2 } from "lucide-react";
import { MOCK_CLIENTES, MOCK_SERVICOS, MOCK_PROFISSIONAIS } from '@/lib/mock-data';
import type { Cliente } from '@/lib/gestao-types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function PerfilClientePage() {
  const router = useRouter();
  
  const [isLogged, setIsLogged] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [cliente, setCliente] = useState<Partial<Cliente> | null>(null);
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  
  const [agendamentos, setAgendamentos] = useState<{ id: string; data: string; servico: string; servico_id?: string; profissional: string; profissional_id?: string; status: string; hora_inicio?: string }[]>([]);

  // Carrega dados salvos no localStorage (simulando auth)
  useEffect(() => {
    const telSalvo = localStorage.getItem('telefone_logado');
    if (telSalvo) {
      logar(telSalvo);
    }
  }, []);

  function logar(tel: string) {
    const limpo = tel.replace(/\D/g, '');
    const c = MOCK_CLIENTES.find(c => c.telefone.replace(/\D/g, '') === limpo);
    
    if (c) {
      setCliente(c);
      // Se houvesse foto mockada: setFotoLocal(c.foto_url);
    } else {
      setCliente({ telefone: tel, nome: 'Usuário Novo' });
    }
    
    // Puxa agendamentos do localstorage
    const salvos = JSON.parse(localStorage.getItem('agendamentos_app') ?? '[]');
    setAgendamentos(salvos);
    setTelefone(tel);
    setIsLogged(true);
    localStorage.setItem('telefone_logado', tel);
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (telefone.length >= 10) logar(telefone);
  };

  const handleLogout = () => {
    localStorage.removeItem('telefone_logado');
    setIsLogged(false);
    setCliente(null);
    setTelefone('');
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFotoLocal(event.target?.result as string);
        // Em um sistema real, faria PUT para backend
      };
      reader.readAsDataURL(file);
    }
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState<any>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const handleCancelClick = (agendamento: any) => {
    const agora = new Date();
    const dataAgendamento = new Date(`${agendamento.data}T${agendamento.hora_inicio || '09:00'}:00`);
    const diffMs = dataAgendamento.getTime() - agora.getTime();
    const diffHoras = diffMs / (1000 * 60 * 60);

    if (diffHoras < 2) {
      alert('O cancelamento online só é permitido com até 2 horas de antecedência. Por favor, entre em contato diretamente com o Studio via WhatsApp para solicitar o reagendamento.');
      window.location.href = `https://wa.me/5542998271222?text=Olá, gostaria de solicitar o reagendamento do meu horário de ${agendamento.servico} no dia ${new Date(agendamento.data).toLocaleDateString('pt-BR')} às ${agendamento.hora_inicio}.`;
      return;
    }

    setAgendamentoParaCancelar(agendamento);
    setShowCancelModal(true);
  };

  const confirmarCancelamento = async () => {
    if (!motivoCancelamento) {
      alert('Por favor, informe o motivo do cancelamento.');
      return;
    }

    setLoadingAction(true);
    try {
      const res = await fetch('/api/agendamento/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: agendamentoParaCancelar.id,
          motivo: motivoCancelamento,
          reagendamentoRecusado: true
        }),
      });

      if (!res.ok) throw new Error('Erro ao cancelar');

      const { whatsappUrl } = await res.json();
      
      // Atualizar localmente também para o modo demo
      const novaLista = agendamentos.map(a => 
        a.id === agendamentoParaCancelar.id ? { ...a, status: 'cancelado' } : a
      );
      setAgendamentos(novaLista);
      localStorage.setItem('agendamentos_app', JSON.stringify(novaLista));

      alert('Agendamento cancelado no sistema. Avisando o Studio via WhatsApp...');
      window.location.href = whatsappUrl;
    } catch (err) {
      console.error(err);
      alert('Erro ao processar cancelamento.');
    } finally {
      setLoadingAction(false);
      setShowCancelModal(false);
    }
  };

  if (!isLogged) {
    return (
      <div className="flex flex-col w-full py-12 md:py-20 bg-[var(--background)] min-h-[80vh] items-center justify-center">
        <div className="container mx-auto px-4 sm:px-6 max-w-md">
          <CardGlass className="p-8 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><User className="text-primary"/> Acesso Rápido</h2>
            <p className="text-foreground/70 mb-8">
              Acesse com seu WhatsApp para visualizar agendamentos (modo demonstração).
            </p>
            
            <form onSubmit={handleLogin}>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Seu WhatsApp</label>
              <input 
                type="tel" 
                autoFocus
                required
                placeholder="(42) 99999-9999"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-4 text-foreground text-lg focus:outline-none focus:border-primary mb-6" 
              />
              <Button type="submit" variant="primary" size="lg" className="w-full uppercase tracking-widest">
                Entrar
              </Button>
            </form>
          </CardGlass>
        </div>
      </div>
    );
  }

  const hoje = new Date().toISOString().split('T')[0];
  const futuros = agendamentos.filter(a => a.data >= hoje && a.status !== 'cancelado');
  const passados = agendamentos.filter(a => a.data < hoje || a.status === 'cancelado');

  return (
    <div className="flex flex-col w-full py-12 md:py-16 bg-[var(--background)] min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        
        {/* HEADER PERFIL */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            {/* Foto Local */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-foreground/5 flex items-center justify-center border-2 border-primary/50 overflow-hidden relative shadow-lg">
                {fotoLocal ? (
                  <Image src={fotoLocal} alt="Perfil" fill className="object-cover" />
                ) : (
                  <User size={36} className="text-foreground/30" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-md">
                <Camera size={16} />
                <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
              </label>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold">{cliente?.nome}</h1>
              <p className="text-foreground/50">{cliente?.telefone}</p>
            </div>
          </div>
          
          <Button variant="ghost" onClick={handleLogout} className="text-foreground/50 hover:text-red-500">
            <LogOut size={18} className="mr-2"/> Sair
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* PRÓXIMOS */}
          <div>
            <h3 className="text-xl font-bold mb-4 uppercase tracking-widest text-foreground/50 border-b border-[var(--border-subtle)] pb-2 flex items-center gap-2">
               <Calendar size={20}/> Próximos
            </h3>
            
            <div className="flex flex-col gap-4">
              {futuros.length === 0 ? (
                <div className="text-center p-8 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl">
                  <p className="text-foreground/50 mb-4">Você não tem horários marcados.</p>
                  <Button variant="primary" onClick={() => router.push('/agendamento')}>
                    Agendar Agora
                  </Button>
                </div>
              ) : (
                futuros.map(ag => {
                  const srv = MOCK_SERVICOS.find(s => s.id === ag.servico_id);
                  const prof = MOCK_PROFISSIONAIS.find(p => p.id === ag.profissional_id);
                  return (
                    <CardGlass key={ag.id} className="p-5 flex flex-col gap-4 border-primary/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg text-foreground">{srv?.nome}</h4>
                          <p className="text-primary font-bold">R$ {srv?.preco}</p>
                        </div>
                        <div className="text-right bg-primary/10 px-3 py-1 rounded">
                          <p className="text-sm font-bold text-primary">{ag.data.split('-').reverse().join('/')}</p>
                          <p className="text-xs text-primary/80">{ag.hora_inicio}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-foreground/70">
                        <User size={14}/> Com {prof?.nome || 'Profissional'}
                      </div>
                      
                      <div className="flex gap-2 mt-2 pt-4 border-t border-[var(--border-subtle)]">
                        <Button variant="outline" size="sm" onClick={() => handleCancelClick(ag)} className="flex-1 text-red-500 hover:border-red-500 hover:bg-red-500/10">
                          <Trash2 size={14} className="mr-2"/> Cancelar
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => router.push('/agendamento')} className="flex-1">
                          Remarcar
                        </Button>
                      </div>
                    </CardGlass>
                  );
                })
              )}
            </div>
          </div>

          {/* HISTÓRICO */}
          <div>
            <h3 className="text-xl font-bold mb-4 uppercase tracking-widest text-foreground/50 border-b border-[var(--border-subtle)] pb-2 flex items-center gap-2">
               <Clock size={20}/> Histórico
            </h3>
            
            <div className="flex flex-col gap-3">
              {passados.length === 0 ? (
                <p className="text-foreground/40 text-sm">Nenhum histórico encontrado.</p>
              ) : (
                passados.map(ag => {
                  const srv = MOCK_SERVICOS.find(s => s.id === ag.servico_id);
                  const isCancelado = ag.status === 'cancelado';
                  return (
                    <div key={ag.id} className={`p-4 rounded-lg border ${isCancelado ? 'border-red-500/20 bg-red-500/5' : 'border-[var(--border-subtle)] bg-[var(--color-card)]'}`}>
                       <div className="flex justify-between items-center mb-1">
                         <span className={`text-xs font-bold uppercase tracking-wider ${isCancelado ? 'text-red-500' : 'text-foreground/40'}`}>
                           {ag.data.split('-').reverse().join('/')} - {isCancelado ? 'Cancelado' : 'Concluído'}
                         </span>
                       </div>
                       <h4 className="font-bold text-foreground opacity-80">{srv?.nome}</h4>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal de Cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <CardGlass className="w-full max-w-md p-6 animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-red-400">
              <Trash2 size={20} /> Cancelar Agendamento
            </h3>
            <p className="text-sm text-foreground/70 mb-6">
              Você está cancelando o serviço de <strong>{agendamentoParaCancelar?.servico}</strong> no dia {agendamentoParaCancelar?.data.split('-').reverse().join('/')}.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground/80 mb-2">Por que você deseja cancelar? *</label>
              <textarea
                value={motivoCancelamento}
                onChange={e => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Tive um imprevisto de trabalho..."
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-red-500 h-24 resize-none"
                required
              />
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowCancelModal(false)}>
                Voltar
              </Button>
              <Button 
                variant="primary" 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none"
                onClick={confirmarCancelamento}
                disabled={loadingAction}
              >
                {loadingAction ? 'Processando...' : 'Confirmar Cancelamento'}
              </Button>
            </div>
          </CardGlass>
        </div>
      )}
    </div>
  );
}
