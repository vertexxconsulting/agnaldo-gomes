'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ProductType = 'AFFILIATE_ML' | 'LOCAL_STOCK';

interface FormData {
  name: string;
  category: string;
  price: string;
  link: string;
  stock: string;
  image_url: string;
  active: boolean;
}

export default function EditarProdutoPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [productType, setProductType] = useState<ProductType>('LOCAL_STOCK');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: '',
    price: '',
    link: '',
    stock: '',
    image_url: '',
    active: true,
  });

  useEffect(() => {
    let cancelled = false;
    const carregar = async () => {
      try {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error || !data) {
          // Produto mock ou inexistente — preenche com valores de demonstração
          if (!cancelled) {
            setFormData({
              name: '',
              category: '',
              price: '',
              link: '',
              stock: '',
              image_url: '',
              active: true,
            });
            setLoaded(true);
          }
          return;
        }
        if (!cancelled) {
          setProductType(data.type === 'AFFILIATE_ML' ? 'AFFILIATE_ML' : 'LOCAL_STOCK');
          setFormData({
            name: data.name ?? '',
            category: data.category ?? '',
            price: String(data.price ?? ''),
            link: data.link ?? '',
            stock: String(data.stock ?? 0),
            image_url: data.image_url ?? '',
            active: data.active ?? true,
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

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Informe o nome do produto.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        type: productType,
        price: parseFloat(formData.price) || 0,
        stock: productType === 'LOCAL_STOCK' ? parseInt(formData.stock) || 0 : 0,
        active: formData.active,
        image_url: formData.image_url || null,
        link: formData.link || null,
      };
      const { data: existing } = await supabase.from('products').select('id').eq('id', id);
      if (existing && existing.length > 0) {
        const { error } = await supabase.from('products').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert({ ...payload, id });
        if (error) throw error;
      }
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
                <input
                  type="url"
                  placeholder="https://produto.mercadolivre.com.br/..."
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
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
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Dados Físicos - Visível apenas para LOCAL_STOCK */}
          {productType === 'LOCAL_STOCK' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">Estoque</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Atual (unidades)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
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

          {/* Imagem */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">Imagem Principal</h2>
            <input
              type="url"
              placeholder="https://exemplo.com/imagem.webp"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <p className="text-xs text-slate-500">Cole a URL da imagem do produto (PNG, JPG ou WEBP).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
