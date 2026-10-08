'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, WifiOff, Wifi, MoreVertical, Monitor } from 'lucide-react';

type Platform = 'ios' | 'android' | 'desktop' | 'other';

// ─── HOOK DE REGISTRO DO SW ────────────────────────────────────────────────
function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        // Verificar atualizações a cada 60 minutos
        setInterval(() => registration.update(), 60 * 60 * 1000);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Novo SW disponível — enviar mensagem para ativar imediatamente
              newWorker.postMessage('skipWaiting');
            }
          });
        });
      } catch (err) {
        console.warn('[PWA] Falha ao registrar Service Worker:', err);
      }
    };

    // Registrar após load para não bloquear a página
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW, { once: true });
    }
  }, []);
}

// ─── HOOK DE STATUS OFFLINE ────────────────────────────────────────────────
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online',  on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return isOnline;
}

// ─── BANNER OFFLINE ────────────────────────────────────────────────────────
function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  const [visible, setVisible] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      setJustReconnected(false);
    } else {
      if (visible) {
        setJustReconnected(true);
        const t = setTimeout(() => {
          setVisible(false);
          setJustReconnected(false);
        }, 3000);
        return () => clearTimeout(t);
      }
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all"
      style={{
        background: justReconnected ? '#10b981' : '#ef4444',
        color: '#fff',
        animation: 'slideDown .3s ease',
      }}
    >
      {justReconnected ? (
        <>
          <Wifi size={15} />
          Conexão restaurada! Atualizando...
        </>
      ) : (
        <>
          <WifiOff size={15} />
          Sem conexão — você está navegando offline
        </>
      )}
      <style>{`@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── PROMPT DE INSTALAÇÃO ──────────────────────────────────────────────────
function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>('other');
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado ou foi descartado
    const isDismissed = localStorage.getItem('pwa-dismissed');
    if (isDismissed) { setDismissed(true); return; }

    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    const ua = window.navigator.userAgent;
    const isIOS     = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isDesktop = !isIOS && !isAndroid;

    // Capturar o evento nativo (Chrome, Edge, Samsung Internet, etc.)
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isAndroid || isDesktop) {
        setPlatform(isDesktop ? 'desktop' : 'android');
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (isIOS) {
      setPlatform('ios');
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  if (isStandalone || !showPrompt || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-3 right-3 md:left-auto md:right-4 md:max-w-sm z-[9999] shadow-2xl rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid rgba(212,175,55,0.3)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="w-11 h-11 bg-black rounded-xl shrink-0 flex items-center justify-center">
          <img src="/icon-192x192.png" alt="AG" className="w-9 h-9 object-contain rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-black leading-tight">
            Instale o App do Studio
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {platform === 'desktop'
              ? 'Use no computador sem abrir o navegador.'
              : 'Acesse rapidinho da tela inicial.'}
          </p>
        </div>
        <button onClick={handleDismiss} className="text-gray-300 hover:text-black p-1 shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* iOS */}
      {platform === 'ios' && (
        <div className="px-4 pb-4 space-y-2">
          <div className="bg-[#FAF8F5] rounded-xl border border-[#D4AF37]/20 p-3 text-[12px] text-gray-700 leading-relaxed">
            <div className="flex items-start gap-2 mb-2.5">
              <span className="bg-[#D4AF37] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Toque no ícone <Share2 size={13} className="inline text-blue-500 mx-0.5" style={{ verticalAlign: '-2px' }} /> <strong>Compartilhar</strong> na barra do Safari</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-[#D4AF37] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Toque em <strong>"Adicionar à Tela de Início"</strong> <PlusSquare size={13} className="inline mx-0.5" style={{ verticalAlign: '-2px' }} /></span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-center">⚠️ Abra no <strong>Safari</strong> para instalar no iPhone</p>
        </div>
      )}

      {/* Android + Desktop com botão nativo */}
      {(platform === 'android' || platform === 'desktop') && (
        <div className="px-4 pb-4">
          {deferredPrompt ? (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: '#D4AF37', color: '#fff' }}
            >
              {platform === 'desktop' ? <Monitor size={16} /> : <Download size={16} />}
              {installing ? 'Instalando...' : 'Instalar App Agora'}
            </button>
          ) : (
            <div className="bg-[#FAF8F5] rounded-xl border border-[#D4AF37]/20 p-3 text-[12px] text-gray-700 leading-relaxed space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="bg-[#D4AF37] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>No Chrome, toque nos 3 pontos <MoreVertical size={13} className="inline mx-0.5" style={{ verticalAlign: '-2px' }} /> no canto superior</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-[#D4AF37] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Clique em <strong>"Instalar"</strong> ou <strong>"Adicionar à tela inicial"</strong> <Smartphone size={13} className="inline mx-0.5" style={{ verticalAlign: '-2px' }} /></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
export function PWAManager() {
  useServiceWorker();
  const isOnline = useOnlineStatus();

  return (
    <>
      <OfflineBanner isOnline={isOnline} />
      <InstallPrompt />
    </>
  );
}

// Manter compatibilidade com o nome antigo
export { PWAManager as PWAInstallPrompt };
