'use client';

import { Check, ShoppingCart, Lock, PlayCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export type CursoCardProps = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  price?: number | string;
  original_price?: number | string;
  current_price?: number | string;
  stripe_payment_link?: string;
  hotmart_link?: string;
  isVip?: boolean;
  schedules?: any;
};

interface CardProps {
  curso: CursoCardProps;
  isEnrolled?: boolean;
  isPurchasable?: boolean;
  onVipSelect?: (curso: CursoCardProps) => void;
}

const formatPrice = (val?: number | string) => {
  if (typeof val === 'number') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }
  if (typeof val === 'string' && val) return val;
  return '—';
};

export function CursoCard({ curso, isEnrolled = false, isPurchasable = false, onVipSelect }: CardProps) {
  const displayPrice = curso.current_price ?? curso.price;
  const hasDiscount =
    curso.original_price &&
    typeof curso.original_price === 'number' &&
    typeof displayPrice === 'number' &&
    curso.original_price > displayPrice;

  const handleStripeBuy = () => {
    if (curso.isVip && onVipSelect) {
      onVipSelect(curso);
      return;
    }
    
    if (curso.stripe_payment_link) {
      window.location.href = curso.stripe_payment_link;
    } else {
      window.location.href = `/academy/checkout/${curso.id}`;
    }
  };

  return (
    <div className="group relative flex flex-col rounded-2xl bg-[var(--color-card)] text-foreground shadow-md border border-[var(--border-subtle)] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-gold/50 overflow-hidden">
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden rounded-t-2xl bg-foreground/5">
        {curso.thumbnail_url ? (
          <Image
            src={curso.thumbnail_url}
            alt={curso.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            placeholder="blur"
            blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-foreground/40">
            Sem capa
          </div>
        )}
        {!isEnrolled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 backdrop-blur-[2px]">
            <span className="px-3 py-1.5 rounded-full bg-gold text-black text-xs font-bold shadow-lg">
              {isPurchasable ? 'Ver Detalhes' : 'Em Breve'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <h2 
          className="text-base sm:text-lg font-bold text-foreground group-hover:text-gold transition-colors line-clamp-1 mb-1.5" 
          title={curso.title}
        >
          {curso.title}
        </h2>
        
        <p className="text-xs sm:text-sm text-foreground/70 line-clamp-2 mb-3 flex-1 leading-relaxed">
          {curso.description || 'Aprenda técnicas exclusivas com o mestre Agnaldo Gomes.'}
        </p>

        {/* Preço (se aplicável e se não estiver matriculado) */}
        {!isEnrolled && displayPrice != null && (
          <div className="flex items-baseline gap-2 mb-3">
            {hasDiscount && (
              <span className="text-xs text-foreground/40 line-through">
                {formatPrice(curso.original_price)}
              </span>
            )}
            <span className="text-base sm:text-lg font-extrabold font-serif text-gold">
              {formatPrice(displayPrice)}
            </span>
          </div>
        )}

        {/* Status badge com alto contraste e legibilidade */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          {isEnrolled ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-500/25">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Acesso liberado</span>
            </span>
          ) : isPurchasable ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 text-gold font-bold border border-gold/30">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Disponível para matrícula</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/60 font-medium border border-[var(--border-subtle)]">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Inscrições em breve</span>
            </span>
          )}
        </div>
      </div>

      {/* Action button — bottom-aligned */}
      <div className="p-4 sm:p-5 pt-0">
        {isEnrolled ? (
          <Link
            href={`/aluno/cursos/${curso.id}`}
            className="flex w-full py-2.5 rounded-xl bg-gold hover:bg-gold-dim text-black font-bold text-sm shadow-md items-center justify-center gap-2 transition-all duration-300"
          >
            <PlayCircle size={16} />
            <span>Acessar curso</span>
          </Link>
        ) : isPurchasable ? (
          <button
            type="button"
            onClick={handleStripeBuy}
            className="flex w-full py-2.5 rounded-xl bg-gold hover:bg-gold-dim text-black font-bold text-sm shadow-md items-center justify-center gap-2 transition-all duration-300"
          >
            <ShoppingCart size={16} />
            <span>Matricular-se agora</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="flex w-full py-2.5 rounded-xl bg-foreground/5 text-foreground/40 font-semibold text-xs border border-[var(--border-subtle)] items-center justify-center gap-1.5 cursor-not-allowed"
          >
            <Lock size={14} />
            <span>Aguardando novas vagas</span>
          </button>
        )}
      </div>
    </div>
  );
}
