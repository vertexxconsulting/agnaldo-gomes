import { cn } from '@/lib/utils';

export interface CardGlassProps {
  className?: string;
  children: React.ReactNode;
  withBorder?: boolean;
}

export function CardGlass({
  className,
  children,
  withBorder = true
}: CardGlassProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-8 backdrop-blur-md',
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
