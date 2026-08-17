'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Link as LinkIcon, Box, Upload, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function NovoProdutoPage() {
  const [productType, setProductType] = useState<'AFFILIATE_ML' | 'LOCAL_STOCK'>('AFFILIATE_ML');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    link: '',
    stock: '',
    image_url: '',
    active: true,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('products').insert({
        name: formData.name,
        category: formData.category,
        type: productType,
        price: parseFloat(formData.price) || 0,
        stock: productType === 'LOCAL_STOCK' ? parseInt(formData.stock) || 0 : 0,
        active: formData.active,
        image_url: formData.image_url || null,
        link: formData.link || null,
      });
      if (error) throw error;
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
                  <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">Extrair Dados</button>
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
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda (R$) *</label>
                <input type="number" step="0.01" placeholder="0,00" 
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea rows={4} className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"></textarea>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estoque Inicial (unidades)</label>
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

          {/* Imagem Principal */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">Imagem Principal</h2>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-amber-500 transition-colors cursor-pointer group bg-slate-50">
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:bg-amber-50 transition-colors text-slate-400 group-hover:text-amber-500">
                <Upload size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-700">Clique ou arraste a imagem</p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP (Máx: 2MB)</p>
            </div>
            {productType === 'AFFILIATE_ML' && (
              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-6 flex items-start gap-3">
                <Info className="shrink-0 mt-0.5" size={18} />
                <p>Ao salvar um link do Mercado Livre, o sistema buscará automaticamente o preço e o estoque se disponível. Produtos do Mercado Livre aparecem com o selo &quot;Afiliado&quot; na vitrine.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
