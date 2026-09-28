'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, MoreVertical } from 'lucide-react';

type Platform = 'ios' | 'android' | 'other';

export function PWAInstallPrompt() {
  const [platform, setPlatform] = useState<Platform>('other');
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Já está rodando como app instalado? Não mostrar.
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Detectar plataforma
    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (isIOS) {
      setPlatform('ios');
      setShowPrompt(true);
    } else if (isAndroid) {
      setPlatform('android');

      // Tentar capturar o evento nativo do Chrome para instalação com 1 clique
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);

      // Mostrar banner após 1.5s mesmo que o evento nativo não dispare (fallback de instruções manuais)
      const timer = setTimeout(() => setShowPrompt(true), 1500);

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div
      className="fixed bottom-4 left-3 right-3 z-[9999] shadow-2xl rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid rgba(212,175,55,0.3)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div className="w-11 h-11 bg-black rounded-xl shrink-0 flex items-center justify-center">
          <img src="/icon-192x192.png" alt="AG" className="w-9 h-9 object-contain rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-black leading-tight">Instale o App do Studio</h4>
          <p className="text-[11px] text-gray-500 mt-0.5">Agende seus horários direto da tela inicial.</p>
        </div>
        <button onClick={() => setShowPrompt(false)} className="text-gray-300 hover:text-black p-1 shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* iOS — instruções passo a passo */}
      {platform === 'ios' && (
        <div className="px-4 pb-4 space-y-2">
          <div className="bg-[#FAF8F5] rounded-xl border border-[#D4AF37]/20 p-3 text-[12px] text-gray-700 leading-relaxed">
            <div className="flex items-start gap-2 mb-2.5">
              <span className="bg-[#D4AF37] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>
                Toque no ícone{' '}
                <Share2 size={13} className="inline text-blue-500 mx-0.5" style={{ verticalAlign: '-2px' }} />
                {' '}<strong>Compartilhar</strong> na barra inferior do Safari
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-[#D4AF37] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>
                Role e toque em <strong>"Adicionar à Tela de Início"</strong>{' '}
                <PlusSquare size={13} className="inline mx-0.5" style={{ verticalAlign: '-2px' }} />
              </span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-center">⚠️ Abra no <strong>Safari</strong> para instalar no iPhone</p>
        </div>
      )}

      {/* Android — botão nativo se disponível, ou instruções manuais */}
      {platform === 'android' && (
        <div className="px-4 pb-4">
          {deferredPrompt ? (
            <button
              onClick={handleAndroidInstall}
              disabled={installing}
              className="w-full font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              style={{ background: '#D4AF37', color: '#fff' }}
            >
              <Download size={16} />
              {installing ? 'Instalando...' : 'Instalar App Agora'}
            </button>
          ) : (
            <div className="bg-[#FAF8F5] rounded-xl border border-[#D4AF37]/20 p-3 text-[12px] text-gray-700 leading-relaxed space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="bg-[#D4AF37] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>
                  No Chrome, toque nos 3 pontos{' '}
                  <MoreVertical size={13} className="inline mx-0.5" style={{ verticalAlign: '-2px' }} />
                  {' '}no canto superior direito
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-[#D4AF37] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>
                  Toque em <strong>"Adicionar à tela inicial"</strong>{' '}
                  <Smartphone size={13} className="inline mx-0.5" style={{ verticalAlign: '-2px' }} />
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
