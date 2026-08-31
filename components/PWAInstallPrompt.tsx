'use client';

import { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export function PWAInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // Default true para evitar flash
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Verificar se já está rodando como app (standalone)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // Detectar iOS
    const ua = window.navigator.userAgent;
    const webkit = !!ua.match(/WebKit/i);
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isIOSDevice = isIPad || isIPhone;
    setIsIOS(isIOSDevice && webkit && !ua.match(/CriOS/i)); // Só mostrar prompt do Safari nativo

    if (isIOSDevice) {
      setShowPrompt(true);
    }

    // Android/Chrome: interceptar o evento de instalação
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-white border border-[#D4AF37]/30 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-8">
      <div className="flex items-start justify-between">
        <div className="flex gap-3 items-center">
          <div className="w-12 h-12 bg-black rounded-xl p-1 shrink-0 shadow-inner flex items-center justify-center">
            <img src="/icon-192x192.png" alt="Agnaldo Gomes" className="w-full h-full object-contain" />
          </div>
          <div>
            <h4 className="text-[15px] font-bold text-black font-serif leading-tight">Instale o App do Studio</h4>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">Agende seus horários mais rápido, direto da tela inicial.</p>
          </div>
        </div>
        <button onClick={() => setShowPrompt(false)} className="text-gray-400 hover:text-black p-1">
          <X size={18} />
        </button>
      </div>

      {isIOS ? (
        <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#D4AF37]/20 text-[13px] text-gray-700">
          Para instalar no iPhone, toque no botão <strong>Compartilhar</strong> <Share size={14} className="inline mx-1 text-blue-500" /> 
          na barra do Safari e depois em <span className="font-semibold text-black">Adicionar à Tela de Início <PlusSquare size={14} className="inline mx-0.5" /></span>.
        </div>
      ) : (
        <button 
          onClick={handleInstallClick}
          className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center justify-center gap-2"
        >
          <Download size={16} />
          Instalar App Agora
        </button>
      )}
    </div>
  );
}
