'use client';

import { useState, useEffect } from 'react';
import { ImageOff, Info, Link2 } from 'lucide-react';
import { normalizeShopImageUrl } from '@/lib/shop-utils';

interface ProductImageFieldProps {
  value: string;
  onChange: (nextUrl: string) => void;
  productType: 'AFFILIATE_ML' | 'LOCAL_STOCK';
}

export function ProductImageField({
  value,
  onChange,
  productType,
}: ProductImageFieldProps) {
  const cleanUrl = normalizeShopImageUrl(value);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [cleanUrl]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
        Imagem Principal
      </h2>

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
                : 'Extraia do Mercado Livre ou cole a URL da imagem abaixo.'}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
          <Link2 size={13} />
          URL da Imagem (PNG, JPG ou WEBP)
        </label>
        <input
          type="url"
          placeholder="https://http2.mlstatic.com/D_NQ_NP_...-O.webp"
          value={value}
          onChange={(e) => onChange(normalizeShopImageUrl(e.target.value))}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {productType === 'AFFILIATE_ML' && (
        <div className="bg-blue-50 text-blue-800 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
          <Info className="shrink-0 mt-0.5" size={16} />
          <p>
            Ao clicar em &quot;Extrair Dados&quot;, o sistema puxa imagem, preço atual, preço promocional (se houver desconto) e título direto do Mercado Livre.
          </p>
        </div>
      )}
    </div>
  );
}
