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
        <span className={cn("text-primary font-semibold uppercase tracking-widest", size === 'default' ? "text-xs" : "text-[10px]")}>
          {subtitle}
        </span>
      )}
      <h2 className={cn("font-bold tracking-tight text-foreground", size === 'default' ? "text-2xl md:text-4xl" : "text-xl md:text-2xl")}>
        {title}
      </h2>
      <div className={cn("bg-primary rounded-full mt-2", size === 'default' ? "w-12 h-[3px] mt-3" : "w-6 h-[2px]")} />
    </div>
  );
}
