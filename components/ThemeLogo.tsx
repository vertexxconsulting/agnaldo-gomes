'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Logo que troca automaticamente conforme o tema:
 * - modo escuro (default): logo dourada/colorida
 * - modo claro (light): logo branca (visível sobre fundo claro)
 */
export function ThemeLogo({ lightSrc, darkSrc, alt, size, className }: {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  size: number;
  className?: string;
}) {
  const [light, setLight] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setLight(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <Image
      src={light ? lightSrc : darkSrc}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
    />
  );
}