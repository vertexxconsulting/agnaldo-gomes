import { LoadingDots } from '@/components/LoadingDots';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <LoadingDots color="bg-primary" />
      <span className="text-sm text-foreground/50 animate-pulse">Carregando...</span>
    </div>
  );
}
