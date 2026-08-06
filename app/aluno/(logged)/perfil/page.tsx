'use client';

import { useState } from 'react';
import { User, Mail, Phone, Lock, Trophy, Flame, Star, Award } from 'lucide-react';
import { Button } from '@/components/Button';

export default function PerfilPage() {
  const [nome, setNome] = useState('Mariana Silva');
  const [email, setEmail] = useState('mariana@example.com');
  const [telefone, setTelefone] = useState('(11) 99999-9999');

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
      <div className="max-w-4xl mx-auto w-full">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Minha Conta</h1>
          <p className="text-white/60">Gerencie seus dados pessoais e acompanhe suas conquistas.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Lado Esquerdo - Dados Pessoais */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Dados Pessoais</h2>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Nome Completo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={18} className="text-white/40" />
                    </div>
                    <input 
                      type="text" 
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">E-mail</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail size={18} className="text-white/40" />
                      </div>
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Telefone</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone size={18} className="text-white/40" />
                      </div>
                      <input 
                        type="tel" 
                        value={telefone}
                        onChange={e => setTelefone(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
                <Button variant="primary" onClick={() => alert('Dados salvos!')}>Salvar Alterações</Button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
               <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Lock size={20} /> Segurança</h2>
               <p className="text-white/60 text-sm mb-4">Atualize sua senha de acesso periodicamente para manter sua conta segura.</p>
               <Button variant="outline" className="text-sm">Alterar Senha</Button>
            </div>

          </div>

          {/* Lado Direito - Gamificação */}
          <div className="flex flex-col gap-6">
            
            {/* Box de Pontuação */}
            <div className="bg-gradient-to-br from-primary/20 to-black border border-primary/30 rounded-xl p-6 text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 text-primary/10">
                 <Trophy size={120} />
              </div>
              
              <div className="relative z-10">
                <h3 className="text-white/80 font-medium mb-1">Seus Pontos</h3>
                <div className="text-4xl font-black text-white mb-2 flex items-center justify-center gap-2">
                  1.450 <Star size={24} className="text-yellow-500 fill-yellow-500" />
                </div>
                <p className="text-xs text-white/50">Você está no <strong className="text-primary">Nível Ouro</strong></p>
                
                <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden mt-4 mb-2">
                  <div className="bg-primary h-full" style={{ width: '75%' }} />
                </div>
                <p className="text-[10px] text-white/40 text-right">Faltam 550 pts para o Nível Diamante</p>
              </div>
            </div>

            {/* Streak / Ofensiva */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold mb-1">Ofensiva Atual</h3>
                <p className="text-xs text-white/50">Dias seguidos estudando</p>
              </div>
              <div className="flex items-center gap-1 text-2xl font-black text-orange-500">
                <Flame size={28} className="fill-orange-500" /> 4
              </div>
            </div>

            {/* Medalhas */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Suas Medalhas</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="flex flex-col items-center gap-2 opacity-100">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                    <Award size={24} className="text-yellow-500" />
                  </div>
                  <span className="text-[10px] text-white/80">Primeiro Passo</span>
                </div>
                <div className="flex flex-col items-center gap-2 opacity-100">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                    <Award size={24} className="text-blue-500" />
                  </div>
                  <span className="text-[10px] text-white/80">Estudioso</span>
                </div>
                <div className="flex flex-col items-center gap-2 opacity-30 grayscale">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <Award size={24} className="text-white" />
                  </div>
                  <span className="text-[10px] text-white/80">Mestre</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
