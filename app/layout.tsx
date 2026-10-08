import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#D4AF37',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Agnaldo Gomes | Cabeleireiro • Educador • Apaixonado pela Beleza',
  description: 'Mais de 30 anos transformando vidas através da beleza. Agnaldo Gomes é cabeleireiro, educador e artista de marcas premium — Studio de Beleza e Academy em Telêmaco Borba/PR.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Studio Hair Style',
  },
};

import { SessionEnforcer } from '@/components/SessionEnforcer';
import { PWAManager } from '@/components/PWAInstallPrompt';
import { RoutePrefetcher } from '@/components/RoutePrefetcher';

/**
 * RootLayout neutro: NÃO inclui Header/Footer — apenas html, fonts e children.
 * Rotas públicas usam app/(public)/layout.tsx (com Header/Footer).
 * Rotas de sistema (admin, aluno, logins) usam layouts específicos sem navegação institucional.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          src="/theme-init.js"
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/30 selection:text-white">
        <SessionEnforcer />
        <PWAManager />
        <RoutePrefetcher />
        {children}
      </body>
    </html>
  );
}
