import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { Button } from "@/components/Button";
import { Scissors, Sparkles, Droplets, Hand, Baby, User, Clock } from "lucide-react";

export default function StudioPage() {
  const servicos = [
    {
      name: "Cortes Femininos",
      icon: Scissors,
      desc: "Cortes personalizados com técnica de visagismo para valorizar seus traços.",
      grupo: "Cortes",
    },
    {
      name: "Cortes Masculinos",
      icon: User,
      desc: "Estilo e precisão para o visual masculino moderno.",
      grupo: "Cortes",
    },
    {
      name: "Cortes Infantis",
      icon: Baby,
      desc: "Atendimento acolhedor para os pequenos, com paciência e cuidado.",
      grupo: "Cortes",
    },
    {
      name: "Coloração & Loiras",
      icon: Sparkles,
      desc: "Loiras deslumbrantes, ruivos vibrantes e morenas iluminadas com colorimetria de precisão.",
      grupo: "Coloração",
    },
    {
      name: "Morena Iluminada",
      icon: Sparkles,
      desc: "Técnica exclusiva de iluminação que traz movimento e profundidade aos fios.",
      grupo: "Coloração",
    },
    {
      name: "Terapia Capilar",
      icon: Droplets,
      desc: "Tratamentos de reconstrução, nutrição e hidratação com produtos premium.",
      grupo: "Cuidados",
    },
    {
      name: "Unhas & Manicure",
      icon: Hand,
      desc: "Unhas perfeitas com acabamento impecável para completar seu visual.",
      grupo: "Unhas",
    },
  ];

  const horarios = [
    { dia: "Segunda a Sexta", horas: "09h às 19h" },
    { dia: "Sábado", horas: "08h às 17h" },
    { dia: "Domingo", horas: "Fechado" },
  ];

  return (
    <div className="flex flex-col w-full py-20">
      <div className="container mx-auto px-6">
        <SectionTitle title="Studio de Beleza" subtitle="Excelência em transformar sua beleza" align="center" />

        <div className="text-center max-w-3xl mx-auto mt-8 mb-16">
          <p className="text-foreground/80 text-base leading-relaxed">
            No Studio Agnaldo Gomes, cada detalhe é pensado para revelar a sua melhor versão.
            Cabelo, estilo e autoestima em um só lugar — com técnicas exclusivas e produtos de alta performance.
          </p>
        </div>

        {/* Serviços */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {servicos.map((s, i) => (
            <div key={i} className="glass p-8 rounded-2xl flex flex-col gap-4 text-center items-center hover:bg-primary/5 transition-colors border-t-2 border-t-primary/50">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <s.icon size={32} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary/70">{s.grupo}</span>
              <h3 className="text-xl font-bold">{s.name}</h3>
              <p className="text-foreground/70 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Horários de Atendimento */}
        <div className="bg-card/40 border border-primary/20 rounded-3xl p-10 max-w-3xl mx-auto mb-20">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Clock className="text-primary" size={24} />
            <h3 className="text-2xl font-bold">Horários de Atendimento</h3>
          </div>
          <div className="flex flex-col gap-4">
            {horarios.map((h, i) => (
              <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0">
                <span className="text-foreground/80 font-medium">{h.dia}</span>
                <span className="text-primary font-semibold">{h.horas}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-foreground/60 text-sm mt-6">
            📍 Rua Prof.ª Otília Macedo Sikorski, 16 — Telêmaco Borba · PR
            <br />Agendamentos exclusivamente pelo formulário do site.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-card/40 border border-primary/20 rounded-3xl p-10 text-center max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-3">Pronto para sua transformação?</h3>
          <p className="text-foreground/70 mb-8 text-sm">Reserve seu horário pelo formulário de agendamento.</p>
          <Link href="/agendamento">
            <Button variant="primary" size="lg" className="px-12 uppercase tracking-widest">
              Agendar Horário
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}