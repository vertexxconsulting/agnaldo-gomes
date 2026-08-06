'use client';

import { motion } from 'framer-motion';

export type ToggleOption = {
  id: string;
  label: string | React.ReactNode;
};

interface ViewToggleProps {
  options: ToggleOption[];
  selectedId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function ViewToggle({ options, selectedId, onChange, className = '' }: ViewToggleProps) {
  return (
    <div className={`flex p-1 bg-foreground/5 rounded-xl border border-[var(--border-subtle)] w-max ${className}`}>
      {options.map((option) => {
        const isSelected = selectedId === option.id;
        
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`relative px-4 py-1.5 text-sm font-medium transition-colors rounded-lg flex items-center justify-center min-w-[80px] z-10 ${
              isSelected ? 'text-primary-foreground' : 'text-foreground/60 hover:text-foreground'
            }`}
            style={{
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isSelected && (
              <motion.div
                layoutId="view-toggle-bubble"
                className="absolute inset-0 bg-primary rounded-lg shadow-sm -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-2">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
