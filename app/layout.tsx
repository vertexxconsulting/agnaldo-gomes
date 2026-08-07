import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const playfair = Playfair_Display({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Agnaldo Gomes | Premium Studio & Academy',
  description: 'Studio de beleza premium e Academy para profissionais por Agnaldo Gomes.',
};

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
        {children}
      </body>
    </html>
  );
}
