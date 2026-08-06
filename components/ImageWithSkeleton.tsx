'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { motion } from 'framer-motion';

/**
 * Imagem com loader skeleton (shimmer) + fade-in quando carrega.
 * Padrão "loader-skeleton": exibe um skeleton pulsante até o <Image> concluir onLoad.
 */
export function ImageWithSkeleton({ className, alt = '', ...props }: ImageProps & { className?: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      {/* Skeleton shimmer */}
      <motion.div
        className="absolute inset-0"
        animate={loaded ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ pointerEvents: 'none' }}
        role="status"
        aria-label="Carregando imagem"
      >
        <div className="h-full w-full animate-pulse bg-card">
          <div className="h-full w-full bg-gradient-to-r from-card via-card/40 to-card" />
        </div>
      </motion.div>

      <Image
        {...props}
        alt={alt}
        onLoad={(e) => {
          setLoaded(true);
          props.onLoad?.(e);
        }}
        className={`object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className ?? ''}`}
      />
    </div>
  );
}