'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MOCK_PRODUCTS, type ShopProduct } from '@/lib/shop-mock';

// Mapeia o slug da URL para a categoria usada na vitrine/mock
const SLUG_CATEGORY: Record<string, string> = {
  'kits-promocionais': 'Kits Promocionais',
  'tratamento': 'Tratamento Capilar',
  'finalizadores': 'Finalização & Styling',
  'barbearia': 'Barbearia',
  'acessorios': 'Acessórios',
  'recomendacoes': 'Recomendações',
  'mais-vendidos': 'Mais Vendidos',
};

function getCategoryName(slug: string): string {
  if (SLUG_CATEGORY[slug]) return SLUG_CATEGORY[slug];
  return slug.replace(/-/g, ' ');
}

function toProduct(p: any): ShopProduct {
  return {
    id: p.id,
    type: p.type ?? 'LOCAL_STOCK',
    name: p.name,
    description: p.description ?? '',
    category: p.category ?? 'Geral',
    image_url: p.image_url ?? '',
    active: p.active ?? true,
    ml_link: p.ml_link ?? null,
    price: p.price ?? null,
    stock_quantity: p.stock_quantity ?? 0,
    rating: p.rating ?? 4.8,
    reviews: p.reviews ?? 40,
    featured: p.featured ?? false,
    tagline: p.tagline ?? null,
  };
}

export default function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(resolved => setSlug(resolved.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function fetchProducts() {
      try {
        let q = supabase.from('products').select('*').eq('active', true);
        if (slug !== 'mais-vendidos' && slug !== 'recomendacoes') {
          const mapped = SLUG_CATEGORY[slug];
          if (mapped) q = q.eq('category', mapped);
        }
        const { data, error } = await q;
        if (cancelled) return;
        if (error) {
          console.error('Supabase error:', error.message);
          setError(error.message);
          setProducts(MOCK_PRODUCTS);
        } else if (data && data.length > 0) {
          setProducts(data.map(toProduct));
        } else {
          setProducts(MOCK_PRODUCTS);
        }
      } catch {
        if (!cancelled) setProducts(MOCK_PRODUCTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const categoryName = getCategoryName(slug);
  const targetCategory = SLUG_CATEGORY[slug] ?? null;

  const filtered = products.filter(p => {
    if (!p.active) return false;
    if (targetCategory && p.category !== targetCategory) return false;
    return true;
  });

  const displayList =
    slug === 'mais-vendidos'
      ? [...filtered].sort((a, b) => b.reviews - a.reviews).slice(0, 8)
      : filtered;

  return (
    <div className="flex flex-col w-full min-h-screen bg-background pb-20">
      {/* Header da Categoria */}
      <section className="bg-card border-b border-[var(--border-subtle)] py-8">
        <div className="container mx-auto px-4 md:px-6">
          <Link href="/loja" className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-primary transition-colors mb-4">
            <ArrowLeft size={16} /> Voltar para Loja
          </Link>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
            {categoryName}
          </h1>
          <p className="text-foreground/50 text-sm mt-2">
            Explore nossa seleção oficial de {categoryName.toLowerCase()}.
          </p>
        </div>
      </section>

      {/* Grid de Produtos */}
      <section className="pt-12">
        <div className="container mx-auto px-4 md:px-6">
          {error && (
            <div className="p-4 bg-warning/10 text-warning border border-warning/25 rounded-lg mb-6 text-sm">
              Exibindo catálogo de demonstração enquanto o banco de dados não está configurado.
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !displayList || displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                <ShoppingBag size={24} className="text-foreground/30" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Nenhum produto encontrado</h3>
              <p className="text-foreground/50 text-sm max-w-md mb-6">
                Estamos preparando novidades para esta categoria. Volte em breve para conferir!
              </p>
              <Link href="/loja" className="text-sm font-semibold text-primary hover:text-primary-hover underline underline-offset-4">
                Ver todos os produtos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {displayList.map((produto) => (
                <Link key={produto.id} href={`/loja/p/${produto.id}`} className="group flex flex-col bg-card border border-[var(--border-subtle)] rounded-xl hover:shadow-lg hover:border-primary/50 transition-all duration-300 relative h-full overflow-hidden">
                  {/* Imagem */}
                  <div className="relative w-full pt-[100%] bg-card">
                    {produto.image_url ? (
                      <Image
                        src={produto.image_url}
                        alt={produto.name}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-background text-foreground/20">
                        <ShoppingBag size={48} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col flex-1 border-t border-[var(--border-subtle)]">
                    <h3 className="text-[12px] text-foreground/80 leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors flex-1 mt-2">
                      {produto.name}
                    </h3>

                    <div className="mt-auto">
                      <div className="text-base font-bold text-foreground mb-3">
                        R$ {Number(produto.price ?? 0).toFixed(2)}
                      </div>

                      <button className="w-full bg-secondary text-foreground border border-transparent text-[11px] font-bold uppercase tracking-wider py-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex items-center justify-center gap-2 rounded-lg shadow-sm">
                        <ShoppingBag size={14} /> Detalhes
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
