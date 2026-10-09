'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';

/**
 * Variantes de animação compartilhadas — padrão editorial premium.
 * Use com <motion.div variants={...} initial="hidden" animate="show" />.
 */

export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.9, ease: 'easeOut' },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: EASE },
  },
};

/** Container com stagger — cada filho com variants fadeUp entra em sequência */
export const staggerContainer = (stagger = 0.12, delayChildren = 0.08): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Para animações de scroll (whileInView) */
export const viewportOnce = { once: true, amount: 0.25 } as const;

/**
 * Hook: respeita prefers-reduced-motion.
 * Se o usuário desativou animações, retorna variantes sem movimento.
 */
export function useAnimationPrefs() {
  const reduced = useReducedMotion();
  if (reduced) {
    return {
      fadeUp: { hidden: { opacity: 0 }, show: { opacity: 1 } } as Variants,
      staggerContainer: (): Variants => ({ hidden: {}, show: {} }),
    };
  }
  return { fadeUp, staggerContainer };
}

export { motion };
