'use client';

import { useState, useEffect, useRef } from 'react';
import { ImageOff, Info, Link2, Upload, Trash2 } from 'lucide-react';
import { normalizeShopImageUrl } from '@/lib/shop-utils';
import { uploadAdminImage } from '@/lib/upload-image';

interface ProductImageFieldProps {
  value: string;
  onChange: (nextUrl: string) => void;
  productType: 'AFFILIATE_ML' | 'LOCAL_STOCK';
  stockLinked?: boolean;
}

export function ProductImageField({
  value,
  onChange,
  productType,
  stockLinked = false,
}: ProductImageFieldProps) {
  const cleanUrl = normalizeShopImageUrl(value);
  const [imgError, setImgError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setImgError(false);
  }, [cleanUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadAdminImage(file, 'loja');
      onChange(publicUrl);
    } catch (err: any) {
      alert(err?.message || 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h2 className="text-base font-semibold text-slate-900">Imagem Principal</h2>
        {cleanUrl && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 cursor-pointer"
            title="Remover imagem"
          >
            <Trash2 size={12} /> Remover
          </button>
        )}
      </div>

      <div className="w-full aspect-square max-h-56 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center overflow-hidden p-3">
        {cleanUrl && !imgError ? (
          <img
            src={cleanUrl}
            alt="Pré-visualização do produto"
            onError={() => setImgError(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-slate-400 px-4">
            <ImageOff size={28} className="mb-2" />
            <p className="text-xs font-medium text-slate-500">
              {cleanUrl
                ? 'Não foi possível carregar esta imagem. Verifique a URL abaixo.'
                : productType === 'AFFILIATE_ML'
                ? 'Extraia do Mercado Livre ou envie/cole uma imagem abaixo.'
                : 'Selecione um item do estoque (com foto) ou envie uma imagem abaixo.'}
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-2 px-3 rounded-lg border border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-50 text-amber-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
      >
        <Upload size={14} />
        {uploading ? 'Enviando imagem...' : 'Enviar Foto do Computador / Celular'}
      </button>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
          <Link2 size={13} />
          Ou cole a URL da Imagem (PNG, JPG ou WEBP)
        </label>
        <input
          type="url"
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(normalizeShopImageUrl(e.target.value))}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {productType === 'AFFILIATE_ML' ? (
        <div className="bg-blue-50 text-blue-800 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
          <Info className="shrink-0 mt-0.5" size={16} />
          <p>
            Ao clicar em &quot;Extrair Dados&quot;, o sistema puxa imagem, preço atual, preço promocional (se houver desconto) e título direto do Mercado Livre.
          </p>
        </div>
      ) : stockLinked ? (
        <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
          <Info className="shrink-0 mt-0.5" size={16} />
          <p>
            Se o produto do estoque já tiver foto cadastrada, ela é puxada automaticamente ao vincular. Você também pode enviar uma foto personalizada para a loja acima.
          </p>
        </div>
      ) : null}
    </div>
  );
}
