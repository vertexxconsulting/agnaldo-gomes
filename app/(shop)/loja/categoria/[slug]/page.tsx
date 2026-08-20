import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Função para mapear o slug da URL para o nome da categoria no banco
function getCategoryNameFromSlug(slug: string): string {
  const map: Record<string, string> = {
    'kits-promocionais': 'Kits Promocionais',
    'tratamento': 'Tratamento',
    'finalizadores': 'Finalizadores',
    'barbearia': 'Barbearia',
    'acessorios': 'Acessórios',
    'mais-vendidos': 'Mais Vendidos',
    'recomendacoes': 'Recomendações',
  };
  return map[slug] || slug.replace(/-/g, ' ');
}

export default async function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const categoryName = getCategoryNameFromSlug(resolvedParams.slug);
  
  // Buscar produtos reais no Supabase
  let query = supabase.from('products').select('*').eq('active', true);
  
  if (resolvedParams.slug !== 'mais-vendidos' && resolvedParams.slug !== 'recomendacoes') {
    query = query.eq('category', categoryName);
  }
  
  const { data: products, error } = await query;

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#f8f9fa] pb-20">
      {/* Header da Categoria */}
      <section className="bg-white border-b border-slate-200 py-8 md:py-8">
        <div className="container mx-auto px-4 md:px-6">
          <Link href="/loja" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-amber-600 transition-colors mb-4">
            <ArrowLeft size={16} /> Voltar para Loja
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 uppercase tracking-widest">
            {categoryName}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Explore nossa seleção oficial de {categoryName.toLowerCase()}.
          </p>
        </div>
      </section>

      {/* Grid de Produtos */}
      <section className="pt-12">
        <div className="container mx-auto px-4 md:px-6">
          
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-sm mb-6 border border-red-100 text-sm">
              Erro ao carregar produtos. Tente novamente.
            </div>
          )}

          {!products || products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag size={24} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhum produto encontrado</h3>
              <p className="text-slate-500 text-sm max-w-md">
                Estamos preparando novidades para esta categoria. Volte em breve para conferir!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {products.map((produto: any) => (
                <Link key={produto.id} href={`/loja/p/${produto.id}`} className="group flex flex-col bg-white border border-slate-200 rounded-sm hover:shadow-lg hover:border-amber-400 transition-all duration-300 relative h-full overflow-hidden">
                  
                  {/* Imagem */}
                  <div className="relative w-full pt-[100%] bg-white">
                    {produto.image_url ? (
                      <Image 
                        src={produto.image_url} 
                        alt={produto.name} 
                        fill 
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-300">
                        <ShoppingBag size={48} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col flex-1 bg-slate-50/50">
                    <h3 className="text-[12px] text-slate-700 leading-tight mb-3 line-clamp-2 group-hover:text-amber-600 transition-colors flex-1 mt-2">
                      {produto.name}
                    </h3>
                    
                    <div className="mt-auto">
                      <div className="text-lg font-bold text-slate-900 mb-3">
                        R$ {Number(produto.price || 0).toFixed(2)}
                      </div>
                      
                      <button className="w-full bg-slate-100 text-slate-900 border border-slate-200 text-[11px] font-bold uppercase tracking-wider py-2 group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-white transition-colors flex items-center justify-center gap-2 rounded-sm shadow-sm">
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
