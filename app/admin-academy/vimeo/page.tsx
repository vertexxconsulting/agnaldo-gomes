'use client';

import { useState, useEffect } from 'react';
import { Video, Key, Eye, EyeOff, AlertTriangle, CheckCircle2, PlayCircle, Loader2 } from 'lucide-react';
import { getVimeoSettings, saveVimeoSettings, VimeoSettings } from '@/lib/vimeo-settings';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';

export default function AdminVimeoAcademy() {
  const [settings, setSettings] = useState<VimeoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mostrarSecret, setMostrarSecret] = useState(false);
  const [mostrarToken, setMostrarToken] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    getVimeoSettings().then(s => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const res = await saveVimeoSettings(settings);
    setSaving(false);
    if (res.ok) {
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    }
  };

  if (loading || !settings) return <div className="p-8 text-center text-foreground/50">Carregando configurações do Vimeo...</div>;

  const isConfigurado = Boolean(settings.access_token && settings.client_id && settings.client_secret);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Video size={24} className="text-primary" /> Hospedagem de Vídeo — Vimeo
        </h1>
        <p className="text-foreground/60 mt-1">
          Configure a integração com o Vimeo para alocar e exibir as aulas da Academy com segurança.
        </p>
      </div>

      {/* Status atual */}
      <div
        className={`rounded-lg border p-4 flex items-start gap-3 ${
          settings.enabled && isConfigurado
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

      {/* Painel de credenciais */}
      <CardGlass className="p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <Key size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">API do Vimeo</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
              Client ID
            </label>
            <input
              type="text"
              value={settings.client_id || ''}
              onChange={e => setSettings({ ...settings, client_id: e.target.value })}
              placeholder="Seu Vimeo Client ID"
              className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2.5 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary rounded-lg font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider flex items-center justify-between">
              <span>Client Secret</span>
              <button
                type="button"
                onClick={() => setMostrarSecret(!mostrarSecret)}
                className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1"
              >
                {mostrarSecret ? <EyeOff size={12} /> : <Eye size={12} />} {mostrarSecret ? 'Ocultar' : 'Mostrar'}
              </button>
            </label>
            <input
              type={mostrarSecret ? 'text' : 'password'}
              value={settings.client_secret || ''}
              onChange={e => setSettings({ ...settings, client_secret: e.target.value })}
              placeholder="Seu Vimeo Client Secret"
              className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2.5 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary rounded-lg font-mono"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-foreground/70 uppercase tracking-wider flex items-center justify-between">
              <span>Access Token (Authenticated)</span>
              <button
                type="button"
                onClick={() => setMostrarToken(!mostrarToken)}
                className="text-primary text-[10px] font-bold hover:underline flex items-center gap-1"
              >
                {mostrarToken ? <EyeOff size={12} /> : <Eye size={12} />} {mostrarToken ? 'Ocultar' : 'Mostrar'}
              </button>
            </label>
            <input
              type={mostrarToken ? 'text' : 'password'}
              value={settings.access_token || ''}
              onChange={e => setSettings({ ...settings, access_token: e.target.value })}
              placeholder="Seu Vimeo Access Token"
              className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2.5 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-primary rounded-lg font-mono"
            />
            <p className="text-[10px] text-foreground/50">
              O token deve ter escopos de `public`, `private` e `video_files` para carregar vídeos privados na Academy.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.enabled}
                onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-foreground/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-3 text-sm font-medium text-foreground">Ativar Integração Real</span>
            </label>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || !settings.client_id}
            className="ml-auto"
          >
            {saving ? <><Loader2 size={16} className="animate-spin mr-2" /> Salvando...</> : 'Salvar Configurações'}
          </Button>
        </div>

        {salvo && (
          <p className="text-xs font-bold text-emerald-500 flex items-center gap-1 justify-end">
            <CheckCircle2 size={14} /> Configurações salvas com sucesso.
          </p>
        )}
      </CardGlass>

      {/* Tutorial rápido */}
      <CardGlass className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <PlayCircle size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Como configurar o Vimeo</h2>
        </div>
        <div className="space-y-3 text-sm text-foreground/70">
          <p>1. Acesse o <a href="https://developer.vimeo.com/apps" target="_blank" className="text-primary underline">Vimeo Developer Portal</a> e crie um novo App.</p>
          <p>2. Em **Authentication**, gere um **Personal Access Token** com as permissões necessárias.</p>
          <p>3. Copie o **Client ID**, **Client Secret** e o **Access Token** para os campos acima.</p>
          <p>4. Na edição de aulas da Academy, basta colar o ID do vídeo do Vimeo (ex: 123456789) no campo de vídeo.</p>
        </div>
      </CardGlass>
    </div>
  );
}
