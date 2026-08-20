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
              className={`glass rounded-2xl p-6 flex flex-col gap-3.5 h-full min-h-[220px] relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                card.highlight ? 'border border-primary/40' : 'border border-white/10'
              }`}
            >
                {card.highlight && (
                  <div className="absolute top-4 right-4 bg-primary text-background text-[9px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full">
                    Destaque
                  </div>
                )}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Icon size={22} />
                </div>
                <h3 className="text-xl font-serif font-bold tracking-tight text-foreground">{card.title}</h3>
                <p className="text-foreground/65 text-[13px] leading-relaxed flex-grow">{card.description}</p>
                <span className="mt-auto pt-1 text-primary font-semibold hover:text-primary-hover uppercase tracking-[0.08em] text-[11px] flex items-center gap-1.5">
                  {card.cta ?? 'Descubra'} <span className="text-base transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              </Link>
          </div>
        );
      })}
    </div>
  );
}
