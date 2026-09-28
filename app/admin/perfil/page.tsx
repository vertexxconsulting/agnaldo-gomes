'use client';

import { useEffect, useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { User, Mail, Lock, Shield, Camera } from 'lucide-react';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

export default function AdminPerfilPage() {
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userInitials, setUserInitials] = useState('AG');
  const [loading, setLoading] = useState(true);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const email = user.email || '';
          const name = user.user_metadata?.full_name || user.user_metadata?.name || 'Administrador';
          setUserEmail(email);
          setUserName(name);
          setUserPhone(user.user_metadata?.phone || '');
          
          if (user.user_metadata?.avatar_url) {
            setUserAvatar(user.user_metadata.avatar_url);
          }
          
          if (name && name !== 'Administrador') {
            const parts = name.split(' ');
            if (parts.length >= 2) {
              setUserInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
            } else {
              setUserInitials(name.substring(0, 2).toUpperCase());
            }
          } else {
            setUserInitials(email.substring(0, 2).toUpperCase());
          }
        }
      } catch (e) {
        console.error('Erro ao carregar perfil:', e);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Mostrar preview imediatamente para melhor UX
      const previewUrl = URL.createObjectURL(file);
      setUserAvatar(previewUrl);

      // Fazer upload para o Storage (bucket 'avatars')
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar metadados do Auth
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      // Atualizar tabela profiles
      await supabase.from('profiles').upsert({
        id: user.id,
        avatar_url: publicUrl
      });

      setUserAvatar(publicUrl);
      alert('Foto de perfil salva com sucesso no banco de dados!');
    } catch (error: any) {
      alert(`Erro ao fazer upload da foto: ${error.message}`);
      // Reverter preview em caso de erro
      setUserAvatar(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const newName = formData.get('name') as string;
    const newPhone = formData.get('phone') as string;

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: newName, phone: newPhone }
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: newName,
          phone: newPhone,
        });
      }

      setUserName(newName);
      setUserPhone(newPhone);
      alert('Perfil atualizado com sucesso!');
    } catch (e: any) {
      alert(`Erro ao atualizar perfil: ${e.message}`);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('Senha atualizada com sucesso!');
    } catch (e: any) {
      alert(`Erro ao atualizar senha: ${e.message}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-foreground/50">Carregando perfil...</div>;

  return (
    <div className="py-4">
      <SectionTitle title="Meu Perfil" subtitle="Configurações da sua conta de administrador" align="left" size="sm" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="col-span-1 flex flex-col gap-6">
          <CardGlass className="flex flex-col items-center p-6 text-center">
            <label className="relative group cursor-pointer mb-4 block">
              <div className="w-24 h-24 rounded-full bg-gold/20 text-gold flex items-center justify-center text-3xl font-bold shadow-inner overflow-hidden border border-gold/30">
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <div className="absolute inset-0 bg-foreground/[0.6] text-background rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                <Camera size={20} className="mb-1" />
                <span className="text-[10px] font-medium uppercase">Alterar</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            
            <h3 className="text-xl font-bold text-foreground">{userName}</h3>
            <p className="text-sm text-foreground/50 mb-4">Administrador do Sistema</p>

            <div className="w-full border-t border-[var(--border-subtle)] pt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm text-foreground/70">
                <Shield size={16} className="text-emerald-500" />
                Acesso Total (Admin)
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground/70">
                <Mail size={16} className="text-foreground/40" />
                {userEmail}
              </div>
            </div>
          </CardGlass>
        </div>

        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <CardGlass className="p-6">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User size={18} className="text-gold" />
              Dados Pessoais
            </h4>
            
            <form className="flex flex-col gap-5" onSubmit={handleUpdateProfile}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Nome Completo</label>
                  <input 
                    type="text" 
                    name="name"
                    defaultValue={userName}
                    className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    name="phone"
                    defaultValue={userPhone}
                    className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">E-mail de Acesso</label>
                <input 
                  type="email" 
                  defaultValue={userEmail}
                  disabled
                  className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground/60 cursor-not-allowed transition-colors"
                />
              </div>

              <div className="flex justify-end mt-2">
                <Button type="submit" variant="primary">Salvar Alterações</Button>
              </div>
            </form>
          </CardGlass>

          <CardGlass className="p-6">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Lock size={18} className="text-gold" />
              Segurança e Senha
            </h4>
            
            <form className="flex flex-col gap-4" onSubmit={handleUpdatePassword}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Senha Atual</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Nova Senha</label>
                  <input 
                    type="password" 
                    name="newPassword"
                    placeholder="••••••••" 
                    className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    name="confirmPassword"
                    placeholder="••••••••" 
                    className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <Button type="submit" variant="outline">Atualizar Senha</Button>
              </div>
            </form>
          </CardGlass>
        </div>
      </div>
    </div>
  );
}
