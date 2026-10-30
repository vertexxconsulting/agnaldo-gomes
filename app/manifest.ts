import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { buildManifestForUrl } from '@/lib/pwa-manifest';

export const dynamic = 'force-dynamic';

/**
 * Manifest dinâmico — detecta a URL/seção do referer para instalar exatamente a página
 * e o contexto corretos (Home, Admin, Academy, Loja ou Agendamento).
 * Nunca força /agendamento quando solicitado a partir de outras páginas.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let targetPath = '/';
  try {
    const headersList = await headers();
    const referer = headersList.get('referer');
    if (referer) {
      const url = new URL(referer);
      targetPath = url.pathname + (url.search || '');
    }
  } catch {}

  return buildManifestForUrl(targetPath) as MetadataRoute.Manifest;
}
