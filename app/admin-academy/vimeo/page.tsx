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

export interface BunnySettings {
  api_key: string | null;
  library_id: string | null;
  enabled: boolean;
}

export interface VideoSettings {
  vimeo: VimeoSettings;
  bunny: BunnySettings;
}

export default function AdminVideoAcademy() {
  const [settings, setSettings] = useState<VideoSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin-academy/vimeo/config');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (e) {
        console.error('Erro ao carregar configurações de vídeo:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading || !settings) return <div className="p-8 text-center text-foreground/50">Carregando configurações de Vídeo...</div>;

  const isVimeoConfigurado = settings.vimeo.enabled;
  const isBunnyConfigurado = settings.bunny.enabled;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Video size={24} className="text-gold" /> Hospedagem de Vídeo
        </h1>
        <p className="text-foreground/60 mt-1">
          Acompanhe o status das integrações com o Bunny.net e o Vimeo para armazenamento e exibição segura das suas aulas.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* BUNNY.NET */}
        <div className="space-y-4">
          <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
            🐰 Bunny.net <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-medium">Principal</span>
          </h2>
          <div
            className={`rounded-lg border p-4 flex items-start gap-3 ${isBunnyConfigurado
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/20'
              }`}
          >
            {isBunnyConfigurado ? (
              <CheckCircle2 size={20} className="text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
            )}
            <div className="text-sm">
              <p className="font-bold text-foreground">
                {isBunnyConfigurado ? 'Integração Bunny ATIVA' : 'Bunny.net Não Configurado'}
              </p>
              <p className="text-foreground/70 mt-0.5">
                {isBunnyConfigurado
                  ? 'O Bunny.net está pronto para proteger e exibir vídeos com o máximo de velocidade (CDN).'
                  : 'Configure BUNNY_API_KEY e BUNNY_STREAM_LIBRARY_ID na Vercel para ativar.'}
              </p>
            </div>
          </div>
          
          <CardGlass className="p-5 text-sm space-y-3">
            <h3 className="font-bold text-foreground border-b border-[var(--border-subtle)] pb-2 mb-2">Como configurar o Bunny Stream</h3>
            <p>1. Acesse o <a href="https://bunny.net" target="_blank" className="text-gold underline">painel do Bunny.net</a> e crie uma nova Stream Video Library.</p>
            <p>2. Copie a <strong>API Key</strong> da aba "API" da Library criada.</p>
            <p>3. Copie o <strong>Library ID</strong> da URL ou das configurações da Library.</p>
            <p>4. Adicione na Vercel as variáveis: <code>BUNNY_API_KEY</code> e <code>BUNNY_STREAM_LIBRARY_ID</code>.</p>
          </CardGlass>
        </div>

        {/* VIMEO */}
        <div className="space-y-4">
          <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
            <Video size={20} className="text-blue-400" /> Vimeo
          </h2>
          <div
            className={`rounded-lg border p-4 flex items-start gap-3 ${isVimeoConfigurado
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-[var(--card-bg)] border-[var(--border-subtle)] opacity-80'
              }`}
          >
            {isVimeoConfigurado ? (
              <CheckCircle2 size={20} className="text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle size={20} className="text-foreground/40 mt-0.5 shrink-0" />
            )}
            <div className="text-sm">
              <p className="font-bold text-foreground">
                {isVimeoConfigurado ? 'Integração Vimeo ATIVA' : 'Vimeo Desativado / Demo'}
              </p>
              <p className="text-foreground/70 mt-0.5">
                {isVimeoConfigurado
                  ? 'Os vídeos estão sendo carregados da sua conta Vimeo (via Vercel Env).'
                  : 'Caso queira usar o Vimeo, preencha as variáveis de ambiente na Vercel.'}
              </p>
            </div>
          </div>

          <CardGlass className="p-5 text-sm space-y-3">
            <h3 className="font-bold text-foreground border-b border-[var(--border-subtle)] pb-2 mb-2">Como configurar o Vimeo</h3>
            <p>1. Acesse o <a href="https://developer.vimeo.com/apps" target="_blank" className="text-gold underline">Vimeo Developer Portal</a> e crie um App.</p>
            <p>2. Em Authentication, gere um Personal Access Token com as permissões necessárias.</p>
            <p>3. Adicione na Vercel as variáveis: <code>VIMEO_CLIENT_ID</code>, <code>VIMEO_CLIENT_SECRET</code> e <code>VIMEO_ACCESS_TOKEN</code>.</p>
          </CardGlass>
        </div>
      </div>
    </div>
  );
}
