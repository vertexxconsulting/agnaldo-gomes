/**
 * Design System – Sistema de Gestão do Studio
 *
 * Fontes de referência aplicadas:
 *  - Impeccable: dark premium, kinpaku gold + verdigris patina, dark warm-black lacquer
 *  - UI-UX Pro Max: typography pairing, token-based colors, spacing scale
 *  - Huashu-Design: HTML/CSS layout patterns, functional layers
 *
 * Inspiração visual:
 *  - Base: dark warm-black lacquer (#0a0a0a)
 *  - Acento primário: copper / kinpaku gold (#c9a84c)
 *  - Acento secundário: verdigris patina (#5a9e8a)
 *  - Texto: champagne (#f0f0f0) / text-warm
 *  - Tipografia: Montserrat (headings) + Inter (body)
 *  - Espaçamento: 8px grid
 *  - Radios: 8px
 *  - Sombra: elevacao leve flat
 *  - Transição: 200ms
 */

export const DESIGN_SYSTEM = {
  name: "Sistema-Gestor Studio",
  description: "Sistema de gestão de estúdio de beleza — painel administrativo",

  // ── Core Tokens ──
  colors: {
    background: "#0a0a0a",         // lacquer-black
    backgroundRaised: "#0f0f0f",   // raised-lacquer
    backgroundContrast: "#141414", // graphite-2
    surface: "#1a1a1a",            // default surface
    surfaceHover: "#222222",       // one step up
    surfaceActive: "#2a2a2a",      // active state
    border: "#2a2a2a",             // gold-hairline
    borderStrong: "#3a3a3a",       // active rule
    text: "#f0f0f0",               // champagne
    textMuted: "#b0b0b0",          // muted text
    textFaint: "#808080",          // subdued
    primary: "#c9a84c",            // kinpaku-gold
    primaryHover: "#d4b45c",       // kinpaku-rich
    primaryActive: "#a88a3c",      // deeper gold
    secondary: "#5a9e8a",          // verdigris-patina (soft green)
    secondaryHover: "#6aae9a",
    accent: "#c9a84c",             // copper accent
    success: "#4a9e6a",
    warning: "#c9a84c",
    error: "#c0392b",
    info: "#3a7ab5",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    section: 64,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  shadow: {
    sm: "0 1px 2px rgba(0,0,0,0.3)",
    md: "0 4px 12px rgba(0,0,0,0.4)",
    lg: "0 8px 24px rgba(0,0,0,0.5)",
    xl: "0 12px 32px rgba(0,0,0,0.6)",
    glow: "0 0 0 1px rgba(201,168,76,0.4)",
  },

  transition: "200ms ease",

  typography: {
    fontHeadings: '"Montserrat", "Plus Jakarta Sans", sans-serif',
    fontBody: '"Inter", "Segoe UI", sans-serif',
    fontMono: '"JetBrains Mono", "Fira Code", monospace',

    sizes: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
    },

    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6,
    },
  },

  animation: {
    duration: "200ms",
    easing: "ease",
  },
};

export type DesignToken = typeof DESIGN_SYSTEM;
