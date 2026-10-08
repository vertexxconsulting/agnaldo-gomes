'use client';

/**
 * RoutePrefetcher — Pré-carrega as rotas mais usadas do sistema em background
 * após o primeiro idle, tornando a navegação SPA-like.
 *
 * Usa requestIdleCallback para não impactar o TTI da página atual.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Rotas críticas pré-carregadas com prioridade alta
const HIGH_PRIORITY_ROUTES = [
  '/agendamento',
  '/hub',
  '/login',
  '/loja',
];

// Rotas carregadas com menor prioridade
const LOW_PRIORITY_ROUTES = [
  '/academy',
  '/perfil',
  '/admin',
  '/contato',
  '/sobre',
];

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const prefetchRoutes = (routes: string[], delay = 0) => {
      const run = () => {
        routes.forEach((route) => {
          try {
            router.prefetch(route);
          } catch {
            // Silently ignore prefetch errors
          }
        });
      };

      if (delay > 0) {
        setTimeout(run, delay);
      } else if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(run, { timeout: 3000 });
      } else {
        setTimeout(run, 1000);
      }
    };

    // Prioridade alta: após 500ms
    prefetchRoutes(HIGH_PRIORITY_ROUTES, 500);

    // Prioridade baixa: quando o browser estiver ocioso
    prefetchRoutes(LOW_PRIORITY_ROUTES, 3000);
  }, [router]);

  return null;
}
