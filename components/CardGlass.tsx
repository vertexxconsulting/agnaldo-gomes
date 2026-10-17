import { cn } from '@/lib/utils';

export interface CardGlassProps {
  className?: string;
  children: React.ReactNode;
  withBorder?: boolean;
  compact?: boolean;
}

export function CardGlass({
  className,
  children,
  withBorder = true,
  compact = false,
}: CardGlassProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl backdrop-blur-md',
        compact ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5',
        withBorder && 'border border-white/10',
        'shadow-md',
        'hover:shadow-lg transition-all duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}
