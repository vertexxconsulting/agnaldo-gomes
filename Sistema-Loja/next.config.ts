import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['3000-ikfmxxggopitmkq31vq9q-6d0ffc35.us3.manus.computer'],

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'http2.mlstatic.com' },
    ],
  },

  // Comprimir respostas com gzip/brotli
  compress: true,

  // Otimizações de bundle
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      '@supabase/supabase-js',
    ],
  },

  async headers() {
    return [
      // ── Segurança em todas as rotas ────────────────────────────────
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control',    value: 'on' },
        ],
      },

      // ── APIs — sem cache (dados dinâmicos) ────────────────────────
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },

      // ── Assets Next.js imutáveis (hash no nome) — cache longo ────
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },

      // ── Imagens públicas — cache de 1 semana ──────────────────────
      {
        source: '/:path*.{png,jpg,jpeg,webp,gif,svg,ico,avif}',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },

      // ── Fontes — cache longo (imutáveis) ─────────────────────────
      {
        source: '/:path*.{woff,woff2,ttf,otf,eot}',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },

      // ── SW e manifest — revalidar frequentemente ──────────────────
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;