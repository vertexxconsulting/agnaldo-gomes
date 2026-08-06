'use client';

import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Aplica o tema salvo no <html> (classe "light") ao carregar.
 * O estado inicial é lido de forma lazy (sem setState em effect).
 */
const temaInicial = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = typeof localStorage.getItem('theme') === 'string' ? localStorage.getItem('theme') : null;
  const prefersDark = window.matchMedia('(prefers-color-scheme: light)').matches;
  return saved === 'light' || (saved === null && prefersDark);
};

export function ThemeToggle() {
  const [light, setLight] = useState<boolean>(temaInicial);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle('light', next);
    localStorage.setItem('theme', next ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggle}
      aria-label={light ? 'Ativar tema escuro' : 'Ativar tema claro'}
      className="p-2 rounded-full text-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
    >
      {light ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}