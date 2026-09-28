'use client';

import { useState, useEffect } from 'react';
import { Video, Key, Eye, EyeOff, AlertTriangle, CheckCircle2, PlayCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';

export interface VimeoSettings {
  id: string;
  access_token: string | null;
  client_id: string | null;
  client_secret: string | null;
  enabled: boolean;
  updated_at: string | null;
}

export default function AdminVimeoAcademy() {
  const [settings, setSettings] = useState<VimeoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mostrarSecret, setMostrarSecret] = useState(false);
  const [mostrarToken, setMostrarToken] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin-academy/vimeo/config');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (e) {
        console.error('Erro ao carregar configurações do Vimeo:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin-academy/vimeo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 3000);
      }
    } catch (e) {
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <div className="p-8 text-center text-foreground/50">Carregando configurações do Vimeo...</div>;

  const isConfigurado = Boolean(settings.access_token && settings.client_id && settings.client_secret);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Video size={24} className="text-gold" /> Hospedagem de Vídeo — Vimeo
        </h1>
        <p className="text-foreground/60 mt-1">
          Configure a integração com o Vimeo para alocar e exibir as aulas da Academy com segurança.
        </p>
      </div>

      <div
        className={`rounded-lg border p-4 flex items-start gap-3 ${settings.enabled && isConfigurado
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-amber-500/10 border-amber-500/20'
          }`}
      >
        {settings.enabled && isConfigurado ? (
          <CheckCircle2 size={20} className="text-emerald-500 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
        )}
        <div className="text-sm">
          <p className="font-bold text-foreground">
            {settings.enabled && isConfigurado ? 'Integração Vimeo ATIVA' : 'Vimeo em modo demonstração'}
          </p>
          <p className="text-foreground/70 mt-0.5">
            {settings.enabled && isConfigurado
              ? 'Os vídeos da Academy estão sendo carregados diretamente da sua conta Vimeo configurada.'
              : 'Insira as credenciais abaixo para ativar a integração real. Enquanto isso, o sistema usa vídeos de demonstração.'}
          </p>
        </div>
      </div>


      <CardGlass className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <PlayCircle size={18} className="text-gold" />
          <h2 className="font-bold text-foreground">Como configurar o Vimeo</h2>
        </div>
        <div className="space-y-3 text-sm text-foreground/70">
          <p>1. Acesse o <a href="https://developer.vimeo.com/apps" target="_blank" className="text-gold underline">Vimeo Developer Portal</a> e crie um novo App.</p>
          <p>2. Em **Authentication**, gere um **Personal Access Token** com as permissões necessárias.</p>
          <p>3. Copie o **Client ID**, **Client Secret** e o **Access Token** para os campos acima.</p>
          <p>4. Na edição de aulas da Academy, basta colar o ID do vídeo do Vimeo (ex: 123456789) no campo de vídeo.</p>
        </div>
      </CardGlass>
    </div>
  );
}
