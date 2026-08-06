'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface BentoCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  cta?: string;
  cellClassName?: string;
  highlight?: boolean;
  external?: boolean;
}

/**
 * Grid bento equilibrado para 3 pilares — lado a lado no desktop,
 * sem animação de entrada (conteúdo sempre visível).
 */
export function BentoGrid({ cards }: { cards: BentoCard[] }) {
  return (
    <div className={`mt-16 grid grid-cols-1 md:grid-cols-3 gap-6`}>
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="col-span-1">
            <Link
              href={card.href}
              {...(card.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={`glass rounded-2xl p-8 flex flex-col gap-4 h-full min-h-[280px] relative overflow-hidden group transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                card.highlight ? 'border border-primary/40' : 'border border-white/10'
              }`}
            >
                {card.highlight && (
                  <div className="absolute top-4 right-4 bg-primary text-background text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    Destaque
                  </div>
                )}
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Icon size={32} />
                </div>
                <h3 className="text-2xl font-bold text-foreground">{card.title}</h3>
                <p className="text-foreground/70 leading-relaxed flex-grow">{card.description}</p>
                <span className="mt-auto pt-2 text-primary font-medium hover:text-primary-hover uppercase tracking-wider text-sm flex items-center gap-2">
                  {card.cta ?? 'Descubra'} <span className="text-xl transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              </Link>
          </div>
        );
      })}
    </div>
  );
}