import { SectionTitle } from "@/components/SectionTitle";
import Image from "next/image";
import { Heart, BookOpen, Scissors, Users } from "lucide-react";

export const metadata = {
  title: 'Sobre Agnaldo Gomes | Cabeleireiro • Educador • Apaixonado pela Beleza',
  description: 'Conheça a história de Agnaldo Gomes: mais de 30 anos dedicados à beleza, à família e ao ensino. Cabeleireiro, educador e apaixonado por transformar vidas.',
};

const valores = [
  {
    icon: Scissors,
    title: 'Excelência Técnica',
    desc: 'Mais de 30 anos refinando cortes, coloração e técnicas capilares com maestria e dedicação.',
  },
  {
    icon: BookOpen,
    title: 'Paixão por Ensinar',
    desc: 'Compartilhar conhecimento é parte da missão. Cada aula é uma oportunidade de transformar uma carreira.',
  },
  {
    icon: Heart,
    title: 'Família como Alicerce',
    desc: 'Ana Mary, Gabriel e Matheus são a força que impulsiona cada passo dessa jornada.',
  },
  {
    icon: Users,
    title: 'Conhecimento que Multiplica',
    desc: 'Acredito que conhecimento compartilhado transforma vidas e fortalece profissionais.',
  },
];

export default function SobrePage() {
  return (
    <div className="flex flex-col w-full">

      {/* ===== HERO SOBRE ===== */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <SectionTitle title="Sobre Agnaldo Gomes" subtitle="Cabeleireiro • Educador • Apaixonado pela Beleza" align="center" />
        </div>
      </section>

      {/* ===== HISTÓRIA PRINCIPAL ===== */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

            {/* Imagem */}
            <div className="lg:col-span-4 relative">
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 shadow-2xl max-w-sm mx-auto">
                <Image
                  src="/perfil.jpg"
                  alt="Agnaldo Gomes — Cabeleireiro e Educador"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-2xl font-bold text-white mb-1">Agnaldo Gomes</h3>
                  <p className="text-primary font-medium text-sm">Cabeleireiro • Educador • Profissional da Beleza</p>
                </div>
              </div>

              {/* Badge de anos de experiência */}
              <div className="absolute -bottom-6 -right-4 lg:right-0 glass border border-primary/30 rounded-2xl px-6 py-4 text-center shadow-xl hidden sm:block">
                <p className="text-4xl font-bold text-primary">+30</p>
                <p className="text-xs text-foreground/70 uppercase tracking-widest mt-1">anos de<br/>experiência</p>
              </div>
            </div>

            {/* Texto da história */}
            <div className="lg:col-span-8 flex flex-col gap-7">
              <div>
                <p className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-4">Minha História</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6">
                  Uma vida dedicada à<br />
                  <span className="text-gradient">arte e ao ensino</span>
                </h2>
              </div>

              <p className="text-foreground/80 text-base leading-relaxed">
                Minha história com a beleza começou muito cedo. Aos <strong>13 anos</strong>, dei meus primeiros passos na profissão de cabeleireiro. Hoje, são mais de <strong>30 anos de experiência</strong>, aprendizado, desafios e muitas histórias transformadas através das minhas mãos.
              </p>

              <p className="text-foreground/80 text-base leading-relaxed">
                Sou <strong>Agnaldo Gomes</strong> — cabeleireiro, educador, esposo da <strong>Ana Mary</strong> e pai de dois filhos, <strong>Gabriel e Matheus</strong>. Minha família é uma parte essencial da minha caminhada e de tudo o que construí.
              </p>

              <p className="text-foreground/80 text-base leading-relaxed">
                Ao longo desses anos, descobri que minha missão vai muito além de transformar cabelos. Uma das minhas maiores paixões é <strong>ensinar</strong>. Amo dar aulas, compartilhar técnicas, dividir experiências e levar conhecimento para outros profissionais que também sonham em crescer na área da beleza.
              </p>

              <p className="text-foreground/80 text-base leading-relaxed">
                Acredito que <strong>conhecimento compartilhado transforma vidas e fortalece profissionais</strong>. Por isso, esta página é um espaço para compartilhar minha trajetória, meus trabalhos, cursos, técnicas, experiências e tudo aquilo que aprendi durante mais de três décadas dedicadas à profissão.
              </p>

              {/* Frase marcante */}
              <div className="border-l-4 border-primary pl-6 py-2 mt-2">
                <p className="text-foreground/90 italic text-lg font-light leading-relaxed">
                  "✨ Beleza transforma. Conhecimento multiplica."
                </p>
                <p className="text-foreground/50 text-sm mt-2 font-medium">— Agnaldo Gomes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== VALORES ===== */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-6">
          <SectionTitle title="Meus Pilares" subtitle="O que guia minha trajetória" align="center" />
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valores.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="glass p-8 rounded-2xl flex flex-col items-center text-center gap-4 hover:bg-primary/5 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Icon size={28} />
                  </div>
                  <h3 className="text-lg font-bold">{v.title}</h3>
                  <p className="text-foreground/70 text-sm leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== MISSÃO ===== */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="glass border border-primary/20 rounded-3xl p-10 md:p-14 text-center">
            <p className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-4">Bem-vindo!</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Seja muito bem-vindo a este espaço
            </h2>
            <p className="text-foreground/70 text-base leading-relaxed max-w-2xl mx-auto">
              Quero fazer desta página um espaço para compartilhar minha trajetória, meus trabalhos, cursos, técnicas, experiências e tudo aquilo que aprendi durante mais de três décadas dedicadas à profissão.
            </p>
            <p className="text-foreground/50 mt-6 font-medium text-sm">
              Agnaldo Gomes — Cabeleireiro • Educador • Profissional da Beleza
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
