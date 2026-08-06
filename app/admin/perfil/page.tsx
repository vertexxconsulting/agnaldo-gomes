'use client';

import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { User, Mail, Lock, Shield, Phone, Camera } from 'lucide-react';
import { Button } from '@/components/Button';

export default function AdminPerfilPage() {
  return (
    <div className="py-4">
      <SectionTitle title="Meu Perfil" subtitle="Configurações da sua conta de administrador" align="left" size="sm" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Coluna da Esquerda: Avatar e Informações Rápidas */}
        <div className="col-span-1 flex flex-col gap-6">
          <CardGlass className="flex flex-col items-center p-6 text-center">
            <div className="relative group cursor-pointer mb-4">
              <div className="w-24 h-24 rounded-full bg-primary/20 text-primary flex items-center justify-center text-3xl font-bold shadow-inner">
                AG
              </div>
              <div className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                <Camera size={20} className="mb-1" />
                <span className="text-[10px] font-medium uppercase">Alterar</span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-foreground">Agnaldo Gomes</h3>
            <p className="text-sm text-foreground/50 mb-4">Administrador do Sistema</p>

            <div className="w-full border-t border-[var(--border-subtle)] pt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm text-foreground/70">
                <Shield size={16} className="text-emerald-500" />
                Acesso Total (Admin)
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground/70">
                <Mail size={16} className="text-foreground/40" />
                admin@agnaldo.com
              </div>
            </div>
          </CardGlass>
        </div>

        {/* Coluna da Direita: Formulários de Edição */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          {/* Dados Pessoais */}
          <CardGlass className="p-6">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User size={18} className="text-primary" />
              Dados Pessoais
            </h4>
            
            <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); alert('Atualização de perfil em desenvolvimento.'); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Nome Completo</label>
                  <input 
                    type="text" 
                    defaultValue="Agnaldo Gomes" 
                    className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    defaultValue="(11) 98888-7777" 
                    className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">E-mail de Acesso</label>
                <input 
                  type="email" 
                  defaultValue="admin@agnaldo.com" 
                  className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex justify-end mt-2">
                <Button variant="primary">Salvar Alterações</Button>
              </div>
            </form>
          </CardGlass>

          {/* Alterar Senha */}
          <CardGlass className="p-6">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Lock size={18} className="text-primary" />
              Segurança e Senha
            </h4>
            
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); alert('Atualização de senha em desenvolvimento.'); }}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Senha Atual</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <Button variant="outline">Atualizar Senha</Button>
              </div>
            </form>
          </CardGlass>
        </div>
      </div>
    </div>
  );
}
