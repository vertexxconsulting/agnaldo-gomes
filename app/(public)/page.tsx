'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Scissors, GraduationCap, User, Sparkles, Droplets, Award, Star, Globe } from 'lucide-react';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/SectionTitle';
import { ParallaxImage } from '@/components/ParallaxImage';
import { BentoGrid } from '@/components/BentoGrid';
import { LogoMarquee } from '@/components/LogoMarquee';
import { FaqSection } from '@/components/FaqSection';
import { Reveal, Stagger, StaggerItem } from '@/components/motion';
import { staggerContainer, fadeUp } from '@/lib/animations';
import { CarouselBackground } from '@/components/CarouselBackground';

const pillars = [
  {
    title: 'Studio de Beleza',
    description:
      'Experiência premium em cortes femininos, masculinos e infantis, coloração, loiras, morena iluminada e terapia capilar — tudo com técnica de visagismo e produtos de alta performance.',
    icon: Scissors,
    href: '/studio',
    cta: 'Conheça o Studio',
  },
  {
    title: 'Academy',
    description:
      'Formação de elite com cursos de Corte, Colorimetria, Escovação, Barbearia, Lavatório e Gestão de Salão. Técnica + posicionamento para faturar de R$ 5 a 10 mil/mês.',
    icon: GraduationCap,
    href: '/academy',
    cta: 'Ver Cursos',
    highlight: true,
  },
  {
    title: 'Artista das Marcas',
    description:
      'Agnaldo Gomes é artista e embaixador das marcas Mirra Cosméticos e Maison Visage, unindo referência técnica e produtos de alto padrão.',
    icon: Award,
    href: '/#artista-das-marcas',
    cta: 'Ver Marcas',
    highlight: true,
  },
];

const services = [
  { name: 'Cortes Femininos', icon: Scissors, desc: 'Visagismo aplicado para valorizar seus traços e revelar sua melhor versão.' },
  { name: 'Cortes Masculinos', icon: User, desc: 'Precisão e estilo para o visual masculino moderno, com acabamento impecável.' },
  { name: 'Coloração & Loiras', icon: Sparkles, desc: 'Loiras deslumbrantes, ruivos vibrantes e colorimetria de alta precisão.' },
  { name: 'Morena Iluminada', icon: Droplets, desc: 'Técnica exclusiva de iluminação com movimento e profundidade aos fios.' },
  { name: 'Terapia Capilar', icon: Award, desc: 'Tratamentos de reconstrução e nutrição com produtos premium.' },
  { name: 'Cortes Infantis', icon: Star, desc: 'Atendimento acolhedor e cuidadoso para os pequenos clientes.' },
];

const marqueeItems = [
  { label: 'Visagismo' },
  { label: 'Cortes' },
  { label: 'Coloração' },
  { label: 'Academy' },
  { label: 'Studio' },
  { label: 'Tratamentos' },
];

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* ===== HERO: vídeo fachada + editorial stagger ===== */}
      <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Vídeo de fundo */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        >
          <source src="/videos/fachada.mp4" type="video/mp4" />
        </video>
        {/* Overlay para legibilidade no modo light */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-background/90" aria-hidden />
        <div className="absolute inset-0 bg-white/20" aria-hidden />

        {/* Conteúdo com stagger */}
        <motion.div
          className="container relative z-10 mx-auto px-6 flex flex-col items-center text-center gap-4"
          variants={staggerContainer(0.15, 0.2)}
          initial="hidden"
          animate="show"
        >
          <motion.span variants={fadeUp} className="text-primary font-bold tracking-[0.2em] uppercase text-sm md:text-base">
            Bem-vindo à excelência
          </motion.span>

          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tighter max-w-4xl leading-tight">
            Descubra o Poder da <br />
            <span className="text-gradient">Sua Melhor Versão</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-foreground/80 text-lg md:text-xl max-w-2xl font-light">
            Onde a arte encontra a técnica. Studio de beleza premium e Academy para formação de profissionais de elite.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mt-6">
            <Link href="/contato">
              <Button variant="primary" size="lg" className="w-full sm:w-auto uppercase tracking-widest text-sm">
                Agende sua Visita
              </Button>
            </Link>
            <Link href="/academy">
              <Button variant="outline" size="lg" className="w-full sm:w-auto uppercase tracking-widest text-sm">
                Conheça os Cursos
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ===== CONTEÚDO: escala 0.93, hero fica 100% natural ===== */}
      <div className="scale-[0.93] xl:scale-[0.95] 2xl:scale-100 transform-origin-top">

      {/* ===== BENTO GRID: pilares ===== */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <SectionTitle title="Nossos Pilares" subtitle="A essência da marca" align="center" />
          <BentoGrid cards={pillars} />
        </div>
      </section>

      {/* ===== AUTORIDADE COM PARALLAX ===== */}
      <section className="py-24 overflow-hidden">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <Reveal className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 shadow-2xl lg:col-span-5 max-w-md mx-auto w-full">
            <ParallaxImage
              src="/perfil.jpg"
              alt="Agnaldo Gomes"
              className="w-full h-full"
              imgClassName="rounded-3xl"
              scaleHeight={110}
              offset={5}
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 right-6">
              <h3 className="text-2xl font-bold text-white mb-1">Agnaldo Gomes</h3>
              <p className="text-primary font-medium text-sm">Master Hair Stylist & Educador</p>
            </div>
          </Reveal>

          <Stagger className="flex flex-col gap-6 lg:col-span-7">
            <StaggerItem>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                30 anos <br />
                <span className="text-gradient">refinando a arte capilar</span>
              </h2>
            </StaggerItem>
            <StaggerItem>
              <p className="text-foreground/80 text-lg leading-relaxed">
                Agnaldo Gomes é especialista em cortes, coloração e mechas, formado nas academias{" "}
                <strong>Pivot Point, Toni &amp; Guy e Llongueras</strong>. Com 30 anos de experiência — iniciados aos 13 — ele transforma cada cliente na sua melhor versão.
              </p>
            </StaggerItem>
            <StaggerItem>
              <p className="text-foreground/80 text-lg leading-relaxed">
                Integra o time <strong>Truss</strong> há 7 anos como técnico e <strong>Truss Lover</strong>, e sua academia já formou centenas de profissionais que hoje são referência no mercado.
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="flex gap-4 mt-6">
                <Link href="/academy">
                  <Button variant="primary" size="lg" className="uppercase tracking-widest text-sm">
                    Conheça os Cursos
                  </Button>
                </Link>
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

{/* ===== ARTISTA DAS MARCAS ===== */}
      <section id="artista-das-marcas" className="relative py-24 overflow-hidden border-y border-[var(--border-subtle)]">
        <CarouselBackground />
        <div className="container relative z-10 mx-auto px-6">
          <SectionTitle title="Artista das Marcas" subtitle="Embaixador técnico de referência" align="center" />
          <p className="text-center text-foreground/60 text-sm mb-12 max-w-2xl mx-auto">
            Agnaldo Gomes atua como artista e embaixadora das marcas que impulsionam seu trabalho.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <a
              href="https://www.instagram.com/maisonvisageoficial/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 bg-white rounded-2xl px-8 py-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 w-56"
              aria-label="Maison Visage — Instagram"
            >
              <Image src="/opt/marca-maison.webp" alt="Maison Visage" width={96} height={96} className="rounded-xl" />
              <div className="text-center">
                <div className="font-bold text-gray-900">Maison Visage</div>
                <div className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Cuidado capilar profissional vegano · 238 mil seguidores
                </div>
                <div className="mt-2 text-xs flex items-center justify-center gap-1 text-pink-500 font-medium">
                  <Globe size={13} /> @maisonvisageoficial
                </div>
              </div>
            </a>
            <a
              href="https://www.instagram.com/mirracosmeticosoficial/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 bg-black rounded-2xl px-8 py-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 w-56"
              aria-label="Mirra Cosméticos — Instagram"
            >
              <span className="relative w-24 h-24 rounded-full bg-white overflow-hidden flex items-center justify-center p-2">
                <Image src="/opt/marca-mirra.webp" alt="Mirra Cosméticos" width={80} height={80} className="rounded-full" />
              </span>
              <div className="text-center">
                <div className="font-bold text-white">Mirra Cosméticos</div>
                <div className="mt-1 text-xs text-gray-400 leading-relaxed">
                  Mais de duas décadas realçando a beleza · 514 mil seguidores
                </div>
                <div className="mt-2 text-xs text-pink-500 flex items-center justify-center gap-1 font-medium">
                  <Globe size={13} /> @mirracosmeticosoficial
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ===== SERVIÇOS ===== */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-6">
          <SectionTitle title="O que oferecemos" subtitle="Excelência em cada detalhe" align="center" />
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="md:col-span-1">
                  <div className="glass p-8 rounded-2xl flex flex-col gap-4 text-center items-center hover:bg-primary/5 transition-colors h-full">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                      <Icon size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">{s.name}</h3>
                    <p className="text-foreground/70">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== DEPOIMENTOS ===== */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <Reveal>
            <SectionTitle title="O que dizem" subtitle="Prova Social" align="center" />
          </Reveal>
          <Stagger className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" amount={0.2}>
            {[
              { name: 'Marina S.', city: 'São Paulo, SP', text: 'A experiência no studio é surreal. O atendimento, a técnica e o resultado superaram todas as minhas expectativas. Recomendo de olhos fechados!' },
              { name: 'Carlos E.', city: 'Santos, SP', text: 'Fiz o curso de visagismo na Academy e foi transformador. Saí preparado para atender com confiança e técnica de elite.' },
              { name: 'Juliana R.', city: 'Campinas, SP', text: 'O Agnaldo entende de rosto e essência. Cada corte valorizou aquilo que eu nem sabia que tinha. Simplesmente impecável.' },
            ].map((t, i) => (
              <StaggerItem key={i}>
                <div className="glass p-8 rounded-2xl flex flex-col gap-6 h-full">
                  <div className="flex text-primary gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={18} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-foreground/80 italic leading-relaxed">“{t.text}”</p>
                  <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">
                      {t.name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{t.name}</h4>
                      <span className="text-xs text-foreground/50">{t.city}</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <FaqSection />

      {/* ===== CTA final ===== */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <Stagger className="flex flex-col items-center gap-6">
            <StaggerItem>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Pronto para <span className="text-gradient">transformar sua imagem?</span>
              </h2>
            </StaggerItem>
            <StaggerItem>
              <p className="text-foreground/70 text-lg max-w-xl">
                Agende seu horário no Studio ou reserve sua vaga na Academy. Comece hoje a sua melhor versão.
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link href="/agendamento">
                  <Button variant="primary" size="lg" className="uppercase tracking-widest text-sm w-full sm:w-auto">
                    Agendar Agora
                  </Button>
                </Link>
                <Link href="/academy">
                  <Button variant="outline" size="lg" className="uppercase tracking-widest text-sm w-full sm:w-auto">
                    Conhecer os Cursos
                  </Button>
                </Link>
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </section>
      </div>
    </div>
  );
}