'use client';

import { useState, useEffect } from 'react';
import { Lock, Unlock, ShoppingCart, PlayCircle, Check, AlertCircle } from 'lucide-react';
import { formatBRL } from '@/lib/pagamentos-academy';
import Link from 'next/link';
import { CursoCard, CursoCardProps } from '@/components/academy/CursoCard';

export default function CatalogPage() {
  const [cursos, setCursos] = useState<CursoCardProps[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin-academy/cursos');
        if (!res.ok) throw new Error('Falha ao carregar');
        const data = await res.json();
        setCursos(data || []);

        const { data: { user } } = await import('@/lib/supabase/client').then(m => m.supabase.auth.getUser().then((r: { data?: { user?: { id?: string; email?: string } | null }; error?: unknown } | null) => r?.data));
        if (user) {
          const { data: enrollments } = await import('@/lib/supabase/client').then(m => m.supabase
            .from('course_enrollments')
            .select('course_id')
            .eq('user_id', user.id));
          const ids = new Set<string>((enrollments || []).map((e: { course_id: string }) => e.course_id));
          setEnrolledIds(ids);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro inesperado');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-4 sm:px-8 lg:px-16 pt-10 pb-20">
        <div className="h-8 bg-gold/10 rounded w-64 animate-pulse mb-2 ml-0" />
        <div className="h-5 bg-gold/10 rounded w-80 animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-foreground/5 border border-gold/10 rounded-md overflow-hidden animate-pulse">
              <div className="aspect-video bg-gold/10" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gold/10 rounded" />
                <div className="h-4 bg-gold/10 rounded w-5/6" />
                <div className="h-4 bg-gold/10 rounded w-3/4" />
                <div className="h-10 bg-gold/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-4 sm:px-8 lg:px-16 pt-10">
        <AlertCircle className="w-8 h-8 text-gold mx-auto mb-4" />
        <p className="text-center text-foreground/60">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-gold text-foreground rounded-lg text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-4 sm:px-8 lg:px-16 pt-10 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-2">Catálogo de Cursos</h1>
        <p className="text-foreground/60 max-w-2xl">
          Cursos com acesso por Stripe (Pix + Cartão de Crédito). Adquira e desbloqueie imediatamente.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cursos.map((curso) => {
          const isEnrolled = enrolledIds.has(curso.id);
          const hasStripeLink = Boolean(curso.stripe_payment_link);
          const locked = !isEnrolled;

          return (
            <CursoCard
              key={curso.id}
              curso={curso}
              isEnrolled={isEnrolled}
              isPurchasable={locked && hasStripeLink}
            />
          );
        })}
      </div>
    </div>
  );
}
