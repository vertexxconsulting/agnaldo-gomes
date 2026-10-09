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
        compact ? 'p-5' : 'p-8',
        withBorder && 'border border-white/10',
        'shadow-lg',
        'hover:shadow-xl transition-all duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}
