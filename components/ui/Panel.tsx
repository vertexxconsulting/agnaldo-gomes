'use client';

import { cn } from '@/lib/utils';

/**
 * Card administrativo compacto e alinhado do novo design system.
 * Fundo claro, borda sutil dourada, cantos consistentes.
 */
export function Panel({
  className,
  children,
  title,
  action,
  compact = true,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl bg-[var(--color-card)] border border-[var(--border-subtle)]',
        'shadow-[0_1px_2px_rgba(20,18,14,0.04)]',
        'transition-shadow duration-300 hover:shadow-[0_4px_16px_rgba(20,18,14,0.07)]',
        compact ? 'p-4' : 'p-6',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          {title && (
            <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Mini estatística compacta para linhas de KPI.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: 'bg-primary/8 border-primary/25',
    primary: 'bg-primary/10 border-primary/35',
    success: 'bg-success/8 border-success/25',
    warning: 'bg-warning/8 border-warning/25',
    danger: 'bg-danger/8 border-danger/25',
  };
  const valueTone: Record<string, string> = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };
  return (
    <div
      className={cn(
        'rounded-xl border px-3.5 py-3 flex items-center gap-3',
        tones[tone],
        className
      )}
    >
      {Icon && (
        <span className="text-primary/70 shrink-0">
          <Icon size={17} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-[0.08em] font-medium text-foreground/45 truncate">
          {label}
        </p>
        <p className={cn('text-lg font-bold leading-tight tracking-tight', valueTone[tone])}>
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * Eyebrow + título de seção compactos e consistentes.
 */
export function SectionHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-3 mb-4', className)}>
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">
            {eyebrow}
          </p>
        )}
        <h2 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <div className="w-7 h-[3px] rounded-full bg-primary mt-2" />
      </div>
      {action && <div className="shrink-0 pb-0.5">{action}</div>}
    </div>
  );
}

/**
 * Badge de status compacto.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const map: Record<string, string> = {
    confirmado: 'bg-success/10 text-success border-success/25',
    concluido: 'bg-foreground/5 text-foreground/60 border-foreground/10',
    pendente: 'bg-warning/10 text-warning border-warning/25',
    em_atendimento: 'bg-primary/10 text-primary border-primary/25',
    cancelado: 'bg-danger/10 text-danger border-danger/25',
    pago: 'bg-success/10 text-success border-success/25',
    entregue: 'bg-foreground/5 text-foreground/60 border-foreground/10',
  };
  const style = map[status] ?? 'bg-foreground/5 text-foreground/60 border-foreground/10';
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border',
        style,
        className
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
