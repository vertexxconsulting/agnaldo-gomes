'use client';

import React from 'react';

/**
 * Wrappers de layout que SEMPRE mantêm o conteúdo visível (opacity: 1 por padrão).
 *
 * NÃO usam animação de entrada com initial="hidden", pois isso pode deixar
 * o conteúdo invisível (opacity:0) se o observer de scroll não disparar.
 * O site serial é de apresentação: conteúdo sempre visível.
 * As props `amount`/`delayChildren`/`stagger` são aceitas por compatibilidade
 * e simplesmente ignoradas.
 */

export function Stagger({
  children,
  className,
  amount,
  stagger,
  delayChildren,
}: {
  children: React.ReactNode;
  className?: string;
  amount?: number;
  stagger?: number;
  delayChildren?: number;
}) {
  void amount;
  void stagger;
  void delayChildren;
  return <div className={className}>{children}</div>;
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}