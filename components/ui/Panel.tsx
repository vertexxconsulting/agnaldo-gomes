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
        'rounded-xl bg-[var(--color-card)] border border-[var(--border-subtle)]',
        'shadow-sm',
        'transition-shadow duration-300 hover:shadow-md',
        compact ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 mb-3">
          {title && (
            <h3 className="text-xs sm:text-sm font-bold text-foreground">{title}</h3>
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
    default: 'border-[var(--border-subtle)]',
    primary: 'border-primary/30 shadow-[0_4px_12px_rgba(212,175,55,0.05)]',
    success: 'border-success/30 shadow-[0_4px_12px_rgba(16,185,129,0.05)]',
    warning: 'border-warning/30 shadow-[0_4px_12px_rgba(245,158,11,0.05)]',
    danger: 'border-danger/30 shadow-[0_4px_12px_rgba(239,68,68,0.05)]',
  };
  
  const iconBg: Record<string, string> = {
    default: 'bg-foreground/5 text-foreground/70',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
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
        'rounded-xl border bg-[var(--color-card)] p-3 sm:p-3.5 flex flex-col gap-1.5 transition-shadow hover:shadow-md',
        tones[tone],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-foreground/50 truncate">
          {label}
        </p>
        {Icon && (
          <div className={cn('p-1 rounded-md shrink-0', iconBg[tone])}>
            <Icon size={14} />
          </div>
        )}
      </div>
      <div>
        <p className={cn('text-lg sm:text-xl font-bold tracking-tight', valueTone[tone])}>
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
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-3 mb-3', className)}>
      <div>
        {eyebrow && (
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary mb-1">
            {eyebrow}
          </p>
        )}
        <h2 className="font-serif text-lg md:text-xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-foreground/70 mt-0.5 max-w-xl">
            {description}
          </p>
        )}
        <div className="w-6 h-[2.5px] rounded-full bg-primary mt-1.5" />
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
