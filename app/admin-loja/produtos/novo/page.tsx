'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Link as LinkIcon, Box } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractMlFromApi, saveAdminProduct } from '@/lib/admin-product-save';
import { calcDiscountPct } from '@/lib/shop-utils';
import { ProductImageField } from '@/components/admin-loja/ProductImageField';

export default function NovoProdutoPage() {
  const [productType, setProductType] = useState<'AFFILIATE_ML' | 'LOCAL_STOCK'>('AFFILIATE_ML');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    original_price: '',
    description: '',
    link: '',
    stock: '',
    image_url: '',
    active: true,
    salon_inventory_id: '',
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const [estoque, setEstoque] = useState<any[]>([]);

  // Carregar estoque
  useEffect(() => {
    async function loadEstoque() {
      try {
        const { data, error } = await supabase
          .from('salon_inventory')
          .select('id, name, type, stock_qty')
          .eq('type', 'PRODUTO')
          .order('name');
        if (!error && data) setEstoque(data);
      } catch (err) {
        console.error('Erro ao buscar estoque:', err);
      }
    }
    loadEstoque();
  }, []);

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
    setSaving(true);
    try {
      const priceVal = parseFloat(formData.price) || 0;
      const originalVal = formData.original_price ? parseFloat(formData.original_price) : null;
      const { error } = await saveAdminProduct({
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
      alert('Erro ao salvar produto. Tente novamente.');
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-2xl font-bold text-slate-900">Cadastrar Produto</h1>
            <p className="text-sm text-slate-500 mt-1">Adicione um novo item à sua loja.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} />
          <span>{saving ? 'Salvando...' : 'Salvar Produto'}</span>
        </button>
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
                <LinkIcon size={28} />
                <span className="font-semibold text-sm">Mercado Livre (Afiliado)</span>
              </button>

              <button 
                onClick={() => setProductType('LOCAL_STOCK')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                  productType === 'LOCAL_STOCK' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-amber-300 text-slate-600'
                }`}
              >
                <Box size={28} />
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
                  <input type="url" 
                  placeholder="https://produto.mercadolivre.com.br/..." 
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                  <button 
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {isExtracting ? 'Extraindo...' : 'Extrair Dados'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Cole o link acima e clique em &quot;Extrair&quot; para puxar nome, preço e fotos automaticamente.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto *</label>
              <input type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria *</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white">
                  <option value="">Selecione...</option>
                  <option value="alisamento">Alisamento</option>
                  <option value="coloracao">Coloração</option>
                  <option value="tratamento">Tratamento</option>
                  <option value="finalizadores">Finalizadores</option>
                  <option value="equipamentos">Equipamentos / Acessórios</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Preço de Venda / Promocional (R$) *
                </label>
                <input type="number" step="0.01" placeholder="0,00" 
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Preço Original / De (R$)
                  </label>
                  {(() => {
                    const pct = calcDiscountPct(parseFloat(formData.price), parseFloat(formData.original_price));
                    return pct ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                        {pct}% OFF
                      </span>
                    ) : null;
                  })()}
                </div>
                <input type="number" step="0.01" placeholder="Opcional (se em promoção)" 
                  value={formData.original_price}
                  onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-base font-semibold text-slate-900">Frete e Dimensões</h2>
                <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-md">Obrigatório para Melhor Envio</span>
              </div>
              
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Inicial (Loja)</label>
                  <input type="number" placeholder="0" 
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />  
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Peso (kg)</label>
                  <input type="number" step="0.001" placeholder="Ex: 0.500" className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Comprimento (cm)</label>
                  <input type="number" placeholder="Ex: 20" className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Largura (cm)</label>
                  <input type="number" placeholder="Ex: 15" className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Altura (cm)</label>
                  <input type="number" placeholder="Ex: 10" className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
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
                <input type="checkbox" 
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
