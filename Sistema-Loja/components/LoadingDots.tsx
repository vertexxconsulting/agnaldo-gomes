'use client';

import { motion } from 'framer-motion';

export function LoadingDots({ color = 'bg-primary' }: { color?: string }) {
  const containerVariants = {
    initial: { transition: { staggerChildren: 0.2 } },
    animate: { transition: { staggerChildren: 0.2 } },
  };

  const dotVariants = {
    initial: { opacity: 0.3, scale: 0.8, y: 0 },
    animate: { opacity: 1, scale: 1.2, y: -4 },
  };

  return (
    <motion.div
      className="flex items-center justify-center gap-2"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`w-3 h-3 rounded-full ${color}`}
          variants={dotVariants}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );
}
