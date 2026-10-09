'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Unlock, ShoppingCart } from 'lucide-react';

export function CourseCatalog() {
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasable, setPurchasable] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const supabase = await import('@/lib/supabase/client').then(m => m.supabase);
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !userData?.user) {
        setLoading(false);
        return;
      }
      setProfile(userData.user);

      // cursos ativos
      const { data: coursesData, error: coursesErr } = await supabase
        .from('courses')
        .select('*')
        .not('status', 'eq', 'INACTIVE')
        .neq('stripe_payment_link', '')
        .order('created_at', { ascending: false });

      if (coursesErr || !coursesData) {
        setLoading(false);
        return;
      }
      setCourses(coursesData);

      // verifica matrículas
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', userData.user.id);

      const map: Record<string, boolean> = {};
      if (enrollments) {
        enrollments.forEach((e: any) => { map[e.course_id] = true; });
      }
      setEnrolled(map);

      // marca quais têm stripe_payment_link (compráveis)
      const purchMap: Record<string, boolean> = {};
      coursesData.forEach((c: any) => {
        purchMap[c.id] = Boolean(c.stripe_payment_link);
      });
      setPurchasable(purchMap);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-foreground/60">
        Carregando catálogo...
      </div>
    );
  }

  const displayCourses = courses.filter(c => purchasable[c.id] || enrolled[c.id]);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Catálogo de Cursos</h1>
        <p className="text-foreground/60 mb-8">Cursos com checkout via Stripe (Pix e cartão)</p>

        {displayCourses.length === 0 && (
          <div className="text-center py-12 text-foreground/40">Nenhum curso disponível no momento.</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCourses.map((course) => {
            const isEnrolled = !!enrolled[course.id];
            const isPurchasable = purchasable[course.id];
            const hasStripe = Boolean(course.stripe_payment_link);

            const getPrice = () => {
              if (course.original_price && course.current_price) {
                return `${course.current_price}`;
              }
              return course.price || '—';
            };

            return (
              <div key={course.id} className="rounded-2xl bg-foreground/5 border border-gold/20 hover:border-gold/40 overflow-hidden transition-shadow hover:shadow-xl hover:shadow-gold/10">
                {/* thumb */}
                {course.thumbnail_url && (
                  <div className="aspect-video relative">
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    {!isEnrolled && isPurchasable && (
                      <div className="absolute inset-0 flex items-center justify-center bg-foreground/50">
                        <span className="px-3 py-1 rounded-full bg-gold text-foreground text-xs font-bold">
                          Comprar
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4">
                  <h2 className="text-lg font-bold mb-1 truncate text-foreground">{course.title}</h2>
                  <p className="text-sm text-foreground/60 line-clamp-2 mb-4">{course.description}</p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-gold">
                      {typeof course.current_price === 'number' ? `R$ ${course.current_price.toFixed(2)}` : course.current_price || '—'}
                    </span>
                    {course.original_price && course.original_price > (course.current_price || 0) && (
                      <span className="text-xs text-foreground/40 line-through ml-2">
                        R$ {Number(course.original_price).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* status */}
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    {isEnrolled ? (
                      <>
                        <Unlock className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">Acesso liberado</span>
                      </>
                    ) : isPurchasable ? (
                      <>
                        <Lock className="w-4 h-4 text-gold" />
                        <span className="text-gold">Disponível à venda</span>
                      </>
                    ) : (
                      <span className="text-foreground/40">Não disponível</span>
                    )}
                  </div>

                  {/* botões */}
                  {isEnrolled ? (
                    <div className="flex gap-2">
                      <Link
                        href={`/aluno/cursos/${course.id}`}
                        className="flex-1 py-2.5 rounded-xl bg-gold text-foreground font-bold text-sm hover:bg-gold-dim transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-gold"
                      >
                        <Unlock size={16} />
                        Acessar curso
                      </Link>
                    </div>
                  ) : isPurchasable ? (
                    <div className="flex gap-2">
                      <Link
                        href={`/academy/checkout/${course.id}`}
                        className="flex-1"
                      >
                        <button className="w-full py-2.5 rounded-xl bg-gold text-foreground font-bold text-sm hover:bg-gold-dim transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-gold">
                          <ShoppingCart size={16} />
                          Adquirir agora
                        </button>
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
