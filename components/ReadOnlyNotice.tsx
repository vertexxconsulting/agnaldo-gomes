'use client';

import React from 'react';
import { Eye, Lock } from 'lucide-react';

interface ReadOnlyNoticeProps {
  modulo?: string;
  className?: string;
}

export function ReadOnlyNotice({ modulo, className = '' }: ReadOnlyNoticeProps) {
  return (
    <div className={`mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center justify-between gap-4 shadow-sm animate-in fade-in ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Eye size={18} />
        </div>
        <div>
          <p className="font-bold text-foreground text-sm flex items-center gap-2">
            Modo Somente Leitura {modulo ? `• ${modulo}` : ''}
          </p>
          <p className="text-xs text-foreground/70 mt-0.5 leading-relaxed">
            Seu usuário possui permissão apenas de <strong>visualização</strong>. Botões de adicionar, editar ou excluir registros foram desativados.
          </p>
        </div>
      </div>
      <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-1.5 shadow-2xs">
        <Lock size={12} /> Somente Leitura
      </span>
    </div>
  );
}
