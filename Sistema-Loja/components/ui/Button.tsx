import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ className, variant = 'gold', size = 'md', loading, children, disabled, ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    gold: 'bg-gold text-black hover:bg-gold-dim hover:scale-[1.02] active:scale-[0.98]',
    ghost: 'bg-transparent text-foreground hover:bg-white/5 hover:scale-[1.02]',
    outline: 'border border-gold text-gold hover:bg-gold hover:text-black hover:scale-[1.02]',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-base',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], disabled && 'opacity-50 pointer-events-none', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
}
