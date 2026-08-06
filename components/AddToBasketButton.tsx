'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/Button';

interface AddToBasketButtonProps {
  label?: string;
  addedLabel?: string;
  className?: string;
}

/**
 * Botão com animação "add-to-basket": ao clicar, mostra um check + feedback
 * de sucesso e retorna ao estado normal (padrão motion.dev "button-add-to-basket").
 */
export function AddToBasketButton({ label = 'Agendar Horário', addedLabel = 'Horário Reservado!', className }: AddToBasketButtonProps) {
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    if (added) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  return (
    <Button variant="primary" size="lg" className={className} onClick={handleClick}>
      <AnimatePresence mode="wait" initial={false}>
        {added ? (
          <motion.span
            key="added"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-2"
          >
            <Check size={18} className="text-background" />
            {addedLabel}
          </motion.span>
        ) : (
          <motion.span
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 uppercase tracking-widest text-sm"
          >
            <ShoppingBag size={16} />
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}