'use client';

import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, description, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card-bg border border-gold/20 rounded-xl shadow-elev-lg w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-foreground/50 hover:text-foreground rounded-full hover:bg-gold/10 transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <X size={18} />
          </button>
        </div>
        {description && (
          <p className="text-sm text-foreground/60 mb-4">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}
