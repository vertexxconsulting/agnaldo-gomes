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
  /** Caminho para o manifest alternativo em /public, ex: "/manifest-admin.json" */
  manifest: string;
}

export function PWAManifestSwitch({ manifest }: Props) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Encontra o <link rel="manifest"> existente ou cria um novo
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = manifest;

    // Restaura o manifest padrão ao sair da seção
    return () => {
      if (link) link.href = '/manifest.webmanifest';
    };
  }, [manifest]);

  return null;
}

