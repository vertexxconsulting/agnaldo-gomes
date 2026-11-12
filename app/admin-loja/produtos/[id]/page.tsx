'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractMlFromApi, saveAdminProduct } from '@/lib/admin-product-save';
import { calcDiscountPct, extractPromoFromRow, normalizeShopImageUrl } from '@/lib/shop-utils';
import { ProductImageField } from '@/components/admin-loja/ProductImageField';

type ProductType = 'AFFILIATE_ML' | 'LOCAL_STOCK';

interface FormData {
  name: string;
  description: string;
  category: string;
  price: string;
  original_price: string;
  link: string;
  stock: string;
  image_url: string;
  active: boolean;
  salon_inventory_id: string;
}

export default function EditarProdutoPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [productType, setProductType] = useState<ProductType>('LOCAL_STOCK');
  const [saving, setSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: '',
    price: '',
    original_price: '',
    link: '',
    stock: '',
    image_url: '',
    active: true,
    salon_inventory_id: '',
  });

  const [estoque, setEstoque] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const carregar = async () => {
      try {
        const [prodRes, estRes] = await Promise.all([
          supabase.from('products').select('*').eq('id', id).single(),
          supabase.from('salon_inventory').select('id, name, type, stock_qty').eq('type', 'PRODUTO').order('name')
        ]);
        if (!cancelled && estRes.data) {
          setEstoque(estRes.data);
        }
        const { data, error } = prodRes;
        if (error || !data) {
          // Produto mock ou inexistente — preenche com valores de demonstração
          if (!cancelled) {
            setFormData({
              name: '',
              description: '',
              category: '',
              price: '',
              original_price: '',
              link: '',
              stock: '',
              image_url: '',
              active: true,
              salon_inventory_id: '',
            });
            setLoaded(true);
          }
          return;
        }
        if (!cancelled) {
          const promo = extractPromoFromRow(data);
          setProductType(data.type === 'AFFILIATE_ML' ? 'AFFILIATE_ML' : 'LOCAL_STOCK');
          setFormData({
            name: data.name ?? '',
            description: data.description ?? '',
            category: data.category ?? '',
            price: data.price !== null && data.price !== undefined ? String(data.price) : '',
            original_price: promo.original_price ? String(promo.original_price) : '',
            link: data.ml_link ?? data.link ?? '',
            stock: String(data.stock_quantity ?? data.stock ?? 0),
            image_url: normalizeShopImageUrl(data.image_url),
            active: data.active ?? true,
            salon_inventory_id: data.salon_inventory_id ?? '',
          });
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    };
    carregar();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleExtract = async () => {
    if (!formData.link) {
      alert('Por favor, insira o link do Mercado Livre primeiro.');
      return;
    }

    setIsExtracting(true);
    try {
      const extracted = await extractMlFromApi(formData.link);
      setFormData((prev) => ({
        ...prev,
        name: extracted.name || prev.name,
        description: extracted.description || prev.description,
        price: extracted.price || prev.price,
        original_price: extracted.original_price,
        image_url: extracted.image_url || prev.image_url,
        link: extracted.ml_link || prev.link,
        category: extracted.category || prev.category,
      }));
      alert(extracted.message);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Falha ao extrair dados. Verifique o link ou preencha manualmente.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Informe o nome do produto.');
      return;
    }
    setSaving(true);
    try {
      const priceVal = parseFloat(formData.price) || 0;
      const originalVal = formData.original_price ? parseFloat(formData.original_price) : null;
      const { error } = await saveAdminProduct({
        id,
        type: productType,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        image_url: formData.image_url,
        active: formData.active,
        ml_link: formData.link || null,
        price: priceVal,
        original_price: originalVal,
        stock_quantity: productType === 'LOCAL_STOCK' ? parseInt(formData.stock) || 0 : 0,
        salon_inventory_id: formData.salon_inventory_id || null,
      });
      if (error) throw new Error(error.message);
      router.push('/admin-loja/produtos');
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      alert('Erro ao salvar produto. Verifique sua conexão com o Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }
    router.push('/admin-loja/produtos');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin-loja/produtos" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{loaded ? 'Editar Produto' : 'Carregando...'}</h1>
            <p className="text-sm text-slate-500 mt-1">Atualize as informações do item na sua loja.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            <span>{saving ? 'Salvando...' : 'Salvar Produto'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="md:col-span-2 space-y-6">
          {/* Tipo de Produto Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Qual é o tipo de produto?</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setProductType('AFFILIATE_ML')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                  productType === 'AFFILIATE_ML' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-amber-300 text-slate-600'
                }`}
              >
                <span className="font-semibold text-sm">Mercado Livre (Afiliado)</span>
              </button>
              <button
                onClick={() => setProductType('LOCAL_STOCK')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                  productType === 'LOCAL_STOCK' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-amber-300 text-slate-600'
                }`}
              >
                <span className="font-semibold text-sm">Estoque Próprio (Físico)</span>
              </button>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">Informações Básicas</h2>

            {productType === 'AFFILIATE_ML' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link do Mercado Livre *</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://meli.la/... ou https://produto.mercadolivre.com.br/..."
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 flex items-center gap-2 cursor-pointer"
                  >
                    {isExtracting ? 'Extraindo...' : 'Extrair Dados'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Cole o link acima e clique em &quot;Extrair Dados&quot; para atualizar preço, promoção e fotos.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                >
                  <option value="">Selecione...</option>
                  <option value="alisamento">Alisamento</option>
                  <option value="coloracao">Coloração</option>
                  <option value="tratamento">Tratamento</option>
                  <option value="finalizadores">Finalizadores</option>
                  <option value="equipamentos">Equipamentos / Acessórios</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda / Promocional (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Preço Original / De (R$)</label>
                  {(() => {
                    const pct = calcDiscountPct(parseFloat(formData.price), parseFloat(formData.original_price));
                    return pct ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                        {pct}% OFF
                      </span>
                    ) : null;
                  })()}
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Opcional (se em promoção)"
                  value={formData.original_price}
                  onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes e benefícios do produto..."
                className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>

          {/* Dados Físicos - Visível apenas para LOCAL_STOCK */}
          {productType === 'LOCAL_STOCK' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">Estoque</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vincular Insumo (Estoque Físico)</label>
                  <select
                    value={formData.salon_inventory_id}
                    onChange={(e) => setFormData({ ...formData, salon_inventory_id: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    <option value="">Não vincular</option>
                    {estoque.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} (Saldo: {item.stock_qty})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Ao vincular, as vendas da loja dão baixa no estoque do Studio.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Atual (Loja)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">Status</h2>
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-5 h-5 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-slate-700">Produto Ativo na Loja</span>
              </label>
              <p className="text-xs text-slate-500 mt-2 ml-8">Desmarque para ocultar o produto sem deletá-lo.</p>
            </div>
          </div>

          <ProductImageField
            value={formData.image_url}
            onChange={(nextUrl) => setFormData((prev) => ({ ...prev, image_url: nextUrl }))}
            productType={productType}
          />
        </div>
      </div>
    </div>
  );
}
