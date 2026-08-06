'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string; // classes do container (aspect, rounded, etc)
  imgClassName?: string;
  /** altura % da imagem em relação ao container — mais que 100% permite o deslocamento (default 130) */
  scaleHeight?: number;
  /** deslocamento em % do movimento parallax (default 12) */
  offset?: number;
  priority?: boolean;
  sizes?: string;
}

/**
 * Imagem com parallax — a imagem é maior que o container (scaleHeight>100)
 * e se move verticalmente conforme a seção atravessa o viewport.
 * Coubo exatamente o padrão motion.dev/react/parallax.
 */
export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  scaleHeight = 130,
  offset = 12,
  priority = false,
  sizes,
}: ParallaxImageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // move a imagem de -offset% a +offset% enquanto a seção passa pelo viewport
  const y = useTransform(scrollYProgress, [0, 1], [`-${offset}%`, `${offset}%`]);

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`relative overflow-hidden ${className ?? ''}`}
    >
      <motion.div
        className="absolute left-0 right-0"
        style={{
          top: `${offset}%`,
          height: `${scaleHeight}%`,
          ...(reduced ? {} : { y }),
        }}
        initial={false}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={`object-cover ${imgClassName ?? ''}`}
        />
      </motion.div>
    </motion.div>
  );
}