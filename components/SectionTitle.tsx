import { cn } from '@/lib/utils';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  size?: 'default' | 'sm';
}

export function SectionTitle({ title, subtitle, className, align = 'center', size = 'default' }: SectionTitleProps) {
  return (
    <div className={cn('flex flex-col gap-3', {
      'items-start text-left': align === 'left',
      'items-center text-center': align === 'center',
      'items-end text-right': align === 'right',
      'mb-12': size === 'default',
      'mb-6': size === 'sm',
    }, className)}>
      {subtitle && (
        <span className={cn("text-primary font-semibold uppercase tracking-widest", size === 'default' ? "text-sm" : "text-xs")}>
          {subtitle}
        </span>
      )}
      <h2 className={cn("font-bold tracking-tight text-foreground", size === 'default' ? "text-3xl md:text-5xl" : "text-2xl")}>
        {title}
      </h2>
      <div className={cn("bg-primary rounded-full mt-2", size === 'default' ? "w-16 h-1 mt-4" : "w-8 h-1")} />
    </div>
  );
}
