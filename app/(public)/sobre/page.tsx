import Image from "next/image";
import Link from "next/link";
import { Heart, BookOpen, Scissors, Users } from "lucide-react";
import { Button } from "@/components/Button";

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

      {/* ===== HERO COM FOTO ===== */}
      <section className="relative w-full min-h-[75vh] flex items-end overflow-hidden">
        {/* Foto de fundo */}
        <Image
          src="/agnaldo9.webp"
          alt="Agnaldo Gomes"
          fill
          className="object-cover object-[center_10%]"
          priority
          sizes="100vw"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

        {/* Conteúdo sobre a foto */}
        <div className="relative z-10 container mx-auto px-6 lg:px-12 pb-16 pt-32 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-white/80 font-bold tracking-[0.3em] uppercase text-xs ml-1">
              Sobre
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold italic font-serif text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#D4AF37] to-[#AA8529] max-w-3xl leading-tight">
              Agnaldo Gomes
            </h1>
          </div>
          
          <span className="text-primary font-medium tracking-[0.1em] uppercase text-xs">
            Cabeleireiro • Educador • Apaixonado pela Beleza
          </span>

          <p className="text-white/75 text-base md:text-lg max-w-xl font-light leading-relaxed mt-2">
            Mais de 30 anos transformando vidas através da arte, do ensino e da paixão pela beleza.
          </p>

          {/* Badge +30 anos */}
          <div className="mt-2 inline-flex items-center gap-3 glass border border-primary/40 rounded-2xl px-6 py-3 w-fit">
            <span className="text-3xl font-bold text-primary">+30</span>
            <span className="text-xs text-white/70 uppercase tracking-widest leading-tight">anos de<br/>experiência</span>
          </div>
        </div>
      </section>

      {/* ===== HISTÓRIA PRINCIPAL ===== */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex flex-col gap-7">
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

            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Link href="/academy">
                <Button variant="primary" size="lg" className="uppercase tracking-widest text-sm w-full sm:w-auto">
                  Conheça os Cursos
                </Button>
              </Link>
              <Link href="/studio">
                <Button variant="outline" size="lg" className="uppercase tracking-widest text-sm w-full sm:w-auto">
                  Visite o Studio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== VALORES ===== */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-3">O que guia minha trajetória</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Meus Pilares</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
