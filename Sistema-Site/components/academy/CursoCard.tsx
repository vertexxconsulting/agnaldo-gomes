'use client';

import { Check, ShoppingCart, Lock } from 'lucide-react';
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
  if (typeof val === 'number') return `R$ ${val.toFixed(2)}`;
  if (typeof val === 'string' && val) return val;
  return '—';
};

export function CursoCard({ curso, isEnrolled = false, isPurchasable = false, onVipSelect }: CardProps) {
  // Price logic — UNCHANGED (preserves original discount math)
  const displayPrice = curso.current_price ?? curso.price;
  const hasDiscount =
    curso.original_price &&
    typeof curso.original_price === 'number' &&
    typeof displayPrice === 'number' &&
    curso.original_price > displayPrice;

  // Checkout logic — UNCHANGED (Stripe link → fallback to checkout page)
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
    <div className="group relative flex flex-col rounded-xl bg-white shadow-md border border-[var(--border-subtle)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden rounded-t-xl bg-foreground/5">
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
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="px-3 py-1 rounded-full bg-gold text-foreground text-xs font-bold">
              {isPurchasable ? 'Consultar' : 'Bloqueado'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h2 className="text-lg font-bold mb-1 text-foreground truncate">{curso.title}</h2>
        <p className="text-sm text-foreground/60 line-clamp-2 mb-3 flex-1">
          {curso.description}
        </p>



        {/* Status badge */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          {isEnrolled ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span>Acesso liberado</span>
            </>
          ) : isPurchasable ? (
            <>
              <Lock className="w-4 h-4 text-gold" />
              <span>Disponível à venda</span>
            </>
          ) : (
            <span className="text-foreground/40">Não disponível</span>
          )}
        </div>
      </div>

      {/* Action button — bottom-aligned */}
      <div className="p-4 pt-0">
        {isEnrolled ? (
          <Link
            href={`/aluno/cursos/${curso.id}`}
            className="flex w-full py-2.5 rounded-md bg-gold text-foreground font-bold text-sm hover:bg-gold-dim transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <Check size={16} />
            Acessar curso
          </Link>
        ) : isPurchasable ? (
          <button
            onClick={handleStripeBuy}
            className="flex w-full py-2.5 rounded-md bg-gold text-foreground font-bold text-sm hover:bg-gold-dim transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <ShoppingCart size={16} />
            Consultar valores
          </button>
        ) : null}
      </div>
    </div>
  );
}
