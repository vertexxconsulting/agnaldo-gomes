'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Trophy, Flame, Star, Award } from 'lucide-react';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  nome: string;
  email: string;
  telefone: string;
  pontos: number;
  nivel: string;
  streak: number;
  medalhas: { nome: string; cor: string }[];
}

// Fallback vazio
const DEFAULT_PROFILE: UserProfile = {
  nome: 'Carregando...',
  email: '',
  telefone: '',
  pontos: 0,
  nivel: 'Iniciante',
  streak: 0,
  medalhas: [],
};

export default function PerfilAlunoPage() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // O layout de servidor já bloqueia acesso não logado, 
          // mas por segurança mantemos.
          return;
        }

        const { data: perfilData, error: perfisError } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url, role')
          .eq('id', user.id)
          .single();

        if (perfilData) {
          const nomeDb = perfilData.full_name || 'Aluno(a)';
          const emailDb = perfilData.email || user.email || '';
          
          setProfile({
            nome: nomeDb,
            email: emailDb,
            telefone: '',
            pontos: 0,
            nivel: 'Iniciante',
            streak: 0,
            medalhas: [],
          });
          setNome(nomeDb);
          setEmail(emailDb);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    carregarPerfil();
  }, []);

  const handleSalvar = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // profiles só tem full_name/email — telefone fica apenas no estado local
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: nome })
          .eq('id', user.id);
        if (error) throw error;
      }
      setProfile(prev => ({ ...prev, nome, email, telefone }));
      alert('Dados salvos!');
    } catch {
      alert('Erro ao salvar. Tente novamente.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
        <div className="max-w-4xl mx-auto w-full">
          <div className="h-8 bg-white/10 rounded w-48 animate-pulse mb-2" />
          <div className="h-5 bg-white/10 rounded w-72 animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-64 animate-pulse" />
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-32 animate-pulse" />
            </div>
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-48 animate-pulse" />
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-32 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
      <div className="max-w-4xl mx-auto w-full">

        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground mb-2">Minha Conta</h1>
          <p className="text-white/60">Gerencie seus dados pessoais e acompanhe suas conquistas.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Lado Esquerdo - Dados Pessoais */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Dados Pessoais</h2>

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
                      className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-foreground focus:outline-none focus:border-gold transition-colors"
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
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-foreground focus:outline-none focus:border-gold transition-colors"
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
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-foreground focus:outline-none focus:border-gold transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSalvar}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>

          </div>

          {/* Lado Direito - Gamificação */}
          <div className="flex flex-col gap-6">

            {/* Box de Pontuação */}
            <div className="bg-gradient-to-br from-gold/20 to-foreground border border-gold/30 rounded-xl p-6 text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 text-primary/10">
                <Trophy size={120} />
              </div>

              <div className="relative z-10">
                <h3 className="text-white/80 font-medium mb-1">Seus Pontos</h3>
                <div className="text-4xl font-black text-foreground mb-2 flex items-center justify-center gap-2">
                  {profile.pontos.toLocaleString('pt-BR')} <Star size={24} className="text-yellow-500 fill-yellow-500" />
                </div>
                <p className="text-xs text-white/50">Você está no <strong className="text-gold">Nível {profile.nivel}</strong></p>

                <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden mt-4 mb-2">
                  <div className="bg-gold h-full" style={{ width: '75%' }} />
                </div>
                <p className="text-[10px] text-white/40 text-right">Faltam 550 pts para o Nível Diamante</p>
              </div>
            </div>

            {/* Streak / Ofensiva */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-between">
              <div>
                <h3 className="text-foreground font-bold mb-1">Ofensiva Atual</h3>
                <p className="text-xs text-white/50">Dias seguidos estudando</p>
              </div>
              <div className="flex items-center gap-1 text-2xl font-black text-orange-500">
                <Flame size={28} className="fill-orange-500" /> {profile.streak}
              </div>
            </div>

            {/* Medalhas */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-foreground font-bold mb-4">Suas Medalhas</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                {profile.medalhas.map((medalha, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-center gap-2 ${medalha.cor === 'gray' ? 'opacity-30 grayscale' : 'opacity-100'}`}
                  >
                    <div className={`w-12 h-12 rounded-full bg-${medalha.cor}-500/20 flex items-center justify-center border border-${medalha.cor}-500/50`}>
                      <Award size={24} className={`text-${medalha.cor}-500`} />
                    </div>
                    <span className="text-[10px] text-white/80">{medalha.nome}</span>
                  </div>
                ))}
                {/* Medalha bloqueada */}
                <div className="flex flex-col items-center gap-2 opacity-30 grayscale">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <Award size={24} className="text-foreground" />
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
