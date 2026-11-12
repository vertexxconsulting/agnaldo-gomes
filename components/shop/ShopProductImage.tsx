'use client';

import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { normalizeShopImageUrl } from '@/lib/shop-utils';

interface ShopProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSize?: number;
}

export function ShopProductImage({
  src,
  alt,
  className = 'w-full h-full object-contain p-4',
  fallbackSize = 36,
}: ShopProductImageProps) {
  const cleanSrc = normalizeShopImageUrl(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [cleanSrc]);

  if (!cleanSrc || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-slate-300">
        <Package size={fallbackSize} />
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`absolute inset-0 ${className}`}
    />
  );
}
