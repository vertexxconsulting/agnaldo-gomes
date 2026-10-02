'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export function SessionEnforcer() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Não precisa verificar em rotas de login/públicas
    if (pathname === '/' || pathname === '/login' || pathname === '/esqueci-senha') {
      return;
    }

    const checkSession = async () => {
      try {
        const savedSecurity = localStorage.getItem('academy_security');
        // Por padrão (se não existir a config), vamos assumir que o bloqueio está ativo
        const blockSimultaneous = savedSecurity ? JSON.parse(savedSecurity).blockSimultaneous !== false : true;

        if (!blockSimultaneous) return;

        const localSessionId = localStorage.getItem('ag_active_session');
        if (!localSessionId) return; // Se não tem sessão local registrada, o usuário pode estar logando ainda.

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const remoteSessionId = user.user_metadata?.active_session_id;
        
        // Se a sessão remota for diferente da local, força o logout
        if (remoteSessionId && remoteSessionId !== localSessionId) {
          console.warn("Sessão simultânea detectada. Sessão Remota:", remoteSessionId, "Local:", localSessionId);
          // await supabase.auth.signOut();
          // localStorage.removeItem('ag_active_session');
          // localStorage.removeItem('ag-sessao');
          
          // alert("Sua sessão foi encerrada porque sua conta foi acessada em outro dispositivo. O rateio de contas não é permitido.");
          // router.replace('/');
        }
      } catch (err) {
        console.error("Erro ao verificar sessão simultânea:", err);
      }
    };

    // Checar imediatamente ao carregar
    checkSession();

    // Checar a cada 5 minutos (300000ms) para evitar rate limits no Supabase
    const interval = setInterval(checkSession, 300000);

    // Checar quando a janela ganhar foco (o usuário voltou para a aba)
    const onFocus = () => checkSession();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [pathname, router]);

  return null;
}
