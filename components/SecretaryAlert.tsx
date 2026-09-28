'use client';

import { useEffect, useState } from 'react';
import { obterIAConfig } from '@/lib/ia-config';
import { BellRing, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SecretaryAlert() {
  const [showAlert, setShowAlert] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Apenas roda no client
    const verificarAlerta = () => {
      const config = obterIAConfig();
      // Só mostra se a configuração estiver ativa
      if (config.relatorios.ativo && config.relatorios.alertaSecretariaAtivo !== false) {
        
        // No mundo real: checaria a hora e dia (ex: se são 19h55)
        // Para este MVP/demonstração: Mostramos o alerta uma vez por sessão 
        // ou se não foi dispensado hoje
        
        const dismissed = sessionStorage.getItem('secretary_alert_dismissed');
        if (!dismissed) {
          // Pequeno delay para animação de entrada
          setTimeout(() => {
            setShowAlert(true);
          }, 2000);
        }
      }
    };

    verificarAlerta();
    
    // Poderia setar um setInterval aqui para checar a hora a cada minuto
  }, []);

  const handleDismiss = () => {
    setShowAlert(false);
    sessionStorage.setItem('secretary_alert_dismissed', 'true');
  };

  const handleGoToDispatch = () => {
    router.push('/admin-ia-assistente');
  };

  if (!showAlert) return null;

  return (
    <div className="bg-amber-500 text-black px-4 py-2.5 flex items-center justify-between shadow-md relative z-50 animate-in slide-in-from-top duration-500">
      <div className="flex items-center gap-3">
        <div className="bg-black/10 p-1.5 rounded-full animate-bounce">
          <BellRing size={18} className="text-black" />
        </div>
        <div>
          <span className="font-bold text-sm block">Atenção Recepção: Hora do Relatório!</span>
          <span className="text-xs font-medium text-black/70">
            Lembre-se de enviar o relatório diário/semanal de métricas para o Agnaldo.
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={handleGoToDispatch}
          className="text-xs font-bold bg-black text-amber-500 px-3 py-1.5 rounded hover:bg-black/80 transition-colors"
        >
          Disparar Agora
        </button>
        <button 
          onClick={handleDismiss}
          className="p-1 hover:bg-black/10 rounded-full transition-colors"
          title="Fechar aviso"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
