export const metadata = {
  title: 'Proposta de Expansão | Vertex Consulting',
  description: 'Proposta de Inovação e Expansão - Fase 2',
};

export default function PropostaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#d4af37]/30 selection:text-white">
      {children}
    </div>
  );
}
