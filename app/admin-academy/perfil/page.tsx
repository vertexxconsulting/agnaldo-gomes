'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from "@/components/SectionTitle";
import { Button } from "@/components/Button";
import { CardGlass } from "@/components/CardGlass";
import { User, Mail, Shield, Camera, Link as LinkIcon, Lock, PlayCircle, Image as ImageIcon } from "lucide-react";
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function AdminAcademyPerfilPage() {
  const [formData, setFormData] = useState({
    name: 'Carregando...',
    email: 'Carregando...',
    bio: 'Especialista em Colorimetria, Visagismo e Gestão de Salões de Beleza. Criador do método Premium Academy para formação de profissionais de elite.',
    instagram: '@',
    youtube: '',
    show_socials: true,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFormData(prev => ({
          ...prev,
          name: user.user_metadata?.full_name || 'Admin',
          email: user.email || '',
          bio: user.user_metadata?.bio || 'Sua biografia aparecerá aqui...',
          instagram: user.user_metadata?.instagram || '@',
          youtube: user.user_metadata?.youtube || '',
          show_socials: user.user_metadata?.show_socials !== false, // default true
        }));
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleSaveProfile = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.name,
          bio: formData.bio,
          instagram: formData.instagram,
          youtube: formData.youtube,
          show_socials: formData.show_socials
        }
      });

      if (error) throw error;
      
      setIsEditing(false);
      alert('Perfil salvo com sucesso!');
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar perfil: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Carregando...') return 'AG';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <SectionTitle 
        title="Perfil do Produtor" 
        subtitle="Gerencie suas informações como instrutor e administrador da Academy." 
        align="left" 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Avatar Card */}
        <CardGlass className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-gold/10 border-4 border-[var(--background)] shadow-xl flex items-center justify-center overflow-hidden">
              <span className="text-4xl font-serif font-bold text-gold">{getInitials(formData.name)}</span>
              {/* Overlay edit */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-foreground cursor-pointer">
                <Camera size={24} className="mb-1" />
                <span className="text-xs font-medium">Trocar Foto</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">{formData.name}</h3>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-medium mt-2">
              <Shield size={12} /> Produtor / Admin
            </span>
          </div>
        </CardGlass>

        {/* Info Form */}
        <CardGlass className="p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-foreground">Informações Pessoais</h3>
            <Button 
              variant={isEditing ? 'primary' : 'outline'} 
              size="sm" 
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Editar Perfil')}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70 flex items-center gap-2">
                  <User size={14} /> Nome Público
                </label>
                <input 
                  type="text"
                  value={formData.name}
                  disabled={!isEditing}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:border-gold focus:outline-none disabled:opacity-70 disabled:bg-foreground/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70 flex items-center gap-2">
                  <Mail size={14} /> E-mail de Acesso
                </label>
                <input 
                  type="email"
                  value={formData.email}
                  disabled={!isEditing}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:border-gold focus:outline-none disabled:opacity-70 disabled:bg-foreground/5"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70 flex items-center gap-2">
                <LinkIcon size={14} /> Biografia (Aparece para os alunos)
              </label>
              <textarea 
                value={formData.bio}
                disabled={!isEditing}
                rows={3}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:border-gold focus:outline-none disabled:opacity-70 disabled:bg-foreground/5 resize-none"
              />
            </div>
          </div>
        </CardGlass>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Redes Sociais */}
        <CardGlass className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-foreground">Redes Sociais</h3>
            
            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={formData.show_socials}
                disabled={!isEditing}
                onChange={(e) => setFormData({...formData, show_socials: e.target.checked})}
              />
              <div className="w-9 h-5 bg-[var(--border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold disabled:opacity-50"></div>
              <span className="ml-2 text-xs font-medium text-foreground/70">
                {formData.show_socials ? 'Visível' : 'Oculto'}
              </span>
            </label>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center flex-shrink-0">
                <ImageIcon size={20} />
              </div>
              <input 
                type="text"
                value={formData.instagram}
                disabled={!isEditing}
                onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                className="w-full bg-transparent border-b border-[var(--border-subtle)] pb-2 text-sm text-foreground focus:border-gold focus:outline-none disabled:opacity-70"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
                <PlayCircle size={20} />
              </div>
              <input 
                type="text"
                value={formData.youtube}
                disabled={!isEditing}
                onChange={(e) => setFormData({...formData, youtube: e.target.value})}
                className="w-full bg-transparent border-b border-[var(--border-subtle)] pb-2 text-sm text-foreground focus:border-gold focus:outline-none disabled:opacity-70"
              />
            </div>
          </div>
        </CardGlass>

        {/* Segurança */}
        <CardGlass className="p-6">
          <h3 className="font-bold text-foreground mb-4">Segurança</h3>
          <div className="space-y-4">
            <p className="text-sm text-foreground/60">
              Para alterar sua senha, enviaremos um link seguro para o seu e-mail cadastrado.
            </p>
            <Button variant="outline" className="w-full flex justify-center items-center gap-2">
              <Lock size={16} /> Solicitar Troca de Senha
            </Button>
          </div>
        </CardGlass>
      </div>
    </div>
  );
}
