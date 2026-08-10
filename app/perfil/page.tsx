'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from "@/components/SectionTitle";
import { Button } from "@/components/Button";
import { CardGlass } from "@/components/CardGlass";
import { LogOut, Calendar, Clock, Scissors, User, Camera, Upload, Trash2, Smartphone } from "lucide-react";
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
  
  const [agendamentos, setAgendamentos] = useState<any[]>([]);

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

  const cancelarAgendamento = (id: string) => {
    if (confirm('Tem certeza que deseja cancelar este horário?')) {
      const novaLista = agendamentos.map(a => 
        a.id === id ? { ...a, status: 'cancelado' } : a
      );
      setAgendamentos(novaLista);
      localStorage.setItem('agendamentos_app', JSON.stringify(novaLista));
    }
  };

  if (!isLogged) {
    return (
      <div className="flex flex-col w-full py-12 md:py-20 bg-[var(--background)] min-h-[80vh] items-center justify-center">
        <div className="container mx-auto px-4 sm:px-6 max-w-md">
          <CardGlass className="p-8 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Smartphone className="text-primary"/> Acesso Rápido</h2>
            <p className="text-foreground/70 mb-8">Informe seu telefone para acessar seus agendamentos.</p>
            
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
                        <Button variant="outline" size="sm" onClick={() => cancelarAgendamento(ag.id)} className="flex-1 text-red-500 hover:border-red-500 hover:bg-red-500/10">
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
    </div>
  );
}