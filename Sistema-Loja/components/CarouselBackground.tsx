'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const defaultImages = [
  '/opt/produto1.png',
  '/opt/produto2.png',
  '/opt/produto3.png',
  '/opt/produto4.png',
  '/opt/produto5.png',
  '/opt/produto6.png',
  '/opt/produto7.png',
];

export function CarouselBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      <motion.div
        className="flex h-full"
        style={{ width: 'fit-content' }}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ ease: 'linear', duration: 30, repeat: Infinity }}
      >
        {[...defaultImages, ...defaultImages].map((src, i) => (
          <div key={i} className="relative w-[50vw] md:w-[30vw] h-full flex-shrink-0 opacity-80">
            <Image
              src={src}
              alt="Carousel Background"
              fill
              className="object-cover"
            />
          </div>
        ))}
      </motion.div>

      {/* Máscaras mais suaves para as imagens aparecerem */}
      <div className="absolute inset-0 bg-background/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-background/90" />
    </div>
  );
}
