export const metadata = {
  title: 'Proposta de Expansão | Vertex Consulting',
  description: 'Proposta de Inovação e Expansão - Fase 2',
};

export default function PropostaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-foreground font-sans selection:bg-[#d4af37]/30 selection:text-foreground">
      {children}
    </div>
  );
}
