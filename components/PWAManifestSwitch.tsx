'use client';

/**
 * PWAManifestSwitch
 *
 * Substitui o <link rel="manifest"> padrão pelo manifest específico da seção,
 * garantindo que o PWA instalado a partir de /admin ou /academy abra
 * diretamente na página correta.
 *
 * Como o layout raiz já declara manifest: '/manifest.webmanifest' via metadata,
 * este componente sobrescreve o atributo href do elemento existente no DOM.
 *
 * Uso: coloque <PWAManifestSwitch manifest="/manifest-admin.json" /> dentro
 * do layout específico (client component).
 */
import { useEffect } from 'react';

interface Props {
  /** Caminho para o manifest alternativo, ou omita para usar a URL atual da janela */
  manifest?: string;
}

export function PWAManifestSwitch({ manifest }: Props) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }

    const currentUrl = window.location.pathname + (window.location.search || '');
    const targetHref = manifest || `/api/pwa/manifest?url=${encodeURIComponent(currentUrl)}`;
    link.setAttribute('href', targetHref);

    // Restaura o manifest com a URL atual ao sair da seção
    return () => {
      if (link) {
        const exitUrl = window.location.pathname + (window.location.search || '');
        link.setAttribute('href', `/api/pwa/manifest?url=${encodeURIComponent(exitUrl)}`);
      }
    };
  }, [manifest]);

  return null;
}

