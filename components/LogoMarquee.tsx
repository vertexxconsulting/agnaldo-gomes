'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

interface TickerItem {
  src?: string;
  label: string;
}

/**
 * Logo ticker — carrossel infinito horizontal (padrão motion.dev "logo-ticker").
 * Duplica o conteúdo p/ que o loop seja contínuo e sem emendar.
 */
export function LogoMarquee({ items, speed = 30 }: { items: TickerItem[]; speed?: number }) {
  const loop = [...items, ...items];

  return (
    <div className="relative w-full overflow-hidden py-4 select-none">
      {/* fades nas bordas */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />

      <motion.div
        className="flex w-max items-center gap-14 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ x: { duration: speed, ease: 'linear', repeat: Infinity } }}
      >
        {loop.map((item, i) => (
          <div key={i} className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
            {item.src && (
              <Image src={item.src} alt={item.label} width={40} height={40} className="rounded-full" />
            )}
            <span className="text-lg font-semibold tracking-wide text-foreground/80">{item.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}