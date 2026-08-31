'use client';


import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Scissors, GraduationCap, User, Sparkles, Droplets, Award, Star, Globe, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/SectionTitle';
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
    title: 'Loja Oficial',
    description:
      'Produtos profissionais das marcas que Agnaldo usa e recomenda no dia a dia do salão — com entrega para todo o Brasil e pagamento seguro.',
    icon: ShoppingBag,
    href: '/loja',
    cta: 'Ver Produtos',
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
      {/* ===== HERO: autoridade nos primeiros 3 segundos ===== */}
      <section className="relative w-full min-h-[92vh] flex items-center overflow-hidden" aria-label="Hero">
        {/* Foto de fundo: Agnaldo trabalhando — presença humana e autoridade */}
        <Image
          src="/agnaldo5.webp"
          alt="Agnaldo Gomes — Master Hair Stylist trabalhando com tesoura no studio"
          fill
          priority
          fetchPriority="high"
          className="object-cover object-center"
          sizes="100vw"
        />

        {/* Overlays para contraste > 4.5:1 */}
        <div className="absolute inset-0 bg-black/55" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/15" aria-hidden />

        {/* Conteúdo editorial com stagger */}
        <motion.div
          className="container relative z-10 mx-auto px-6 lg:px-14 flex flex-col items-start text-left gap-4 py-24"
          variants={staggerContainer(0.13, 0.15)}
          initial="hidden"
          animate="show"
        >
          {/* Eyebrow — credencial verificável */}
          <motion.span
            variants={fadeUp}
            className="text-primary font-bold tracking-[0.22em] uppercase text-[10px] md:text-[11px]"
          >
            MASTER HAIR STYLIST · EDUCADOR · +30 ANOS
          </motion.span>

          {/* H1 — credencial concreta, não promessa genérica */}
          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-5xl lg:text-[3.5rem] xl:text-6xl font-light tracking-tight max-w-2xl leading-[1.08]"
          >
            <span className="text-white font-light">O cabeleireiro que</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#D4AF37] to-[#AA8529] font-bold italic font-serif">
              forma cabeleireiros.
            </span>
          </motion.h1>

          {/* Subheadline — marcas e localização */}
          <motion.p
            variants={fadeUp}
            className="text-white/75 text-sm md:text-base max-w-md font-light leading-relaxed"
          >
            Master Hair Stylist, embaixador Mirra Cosméticos e Maison Visage.
            Studio em Telêmaco Borba/PR e formação para quem quer viver bem da beleza.
          </motion.p>

          {/* CTAs com hierarquia clara */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-3"
          >
            {/* CTA Primário — sólido, alto contraste */}
            <Link
              href="/agendamento"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'hero_cta_primary_click');
                }
              }}
            >
              <Button
                variant="primary"
                className="min-w-[200px] py-3.5 px-7 text-sm font-bold tracking-wide shadow-xl shadow-primary/25"
              >
                Agendar meu horário
              </Button>
            </Link>

            {/* CTA Secundário — link com seta, sem preenchimento */}
            <Link
              href="/academy"
              className="group inline-flex items-center gap-2 text-white/80 hover:text-primary text-sm font-semibold transition-colors duration-200 min-h-[44px] px-1"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'hero_cta_secondary_click');
                }
              }}
            >
              Quero me formar
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </motion.div>

          {/* Barra de credenciais — 4 stats, 2×2 no mobile */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 mt-6 pt-6 border-t border-white/15 w-full max-w-2xl"
          >
            {/* Stat 1 */}
            <div className="flex flex-col gap-0.5">
              <span className="text-primary font-extrabold text-xl md:text-2xl leading-none">+30</span>
              <span className="text-white/50 text-[11px] uppercase tracking-wider">anos de carreira</span>
            </div>
            {/* Stat 2 — TODO: confirmar número real de profissionais formados */}
            <div className="flex flex-col gap-0.5">
              <span className="text-primary font-extrabold text-xl md:text-2xl leading-none">
                {/* TODO: substituir pelo número real de profissionais formados */}
                +[N]
              </span>
              <span className="text-white/50 text-[11px] uppercase tracking-wider">profissionais formados</span>
            </div>
            {/* Stat 3 */}
            <div className="flex flex-col gap-0.5">
              <span className="text-primary font-extrabold text-xl md:text-2xl leading-none">2x</span>
              <span className="text-white/50 text-[11px] uppercase tracking-wider">embaixador oficial</span>
            </div>
            {/* Stat 4 — TODO: confirmar nota e qtd de avaliações no Google Business */}
            <div className="flex flex-col gap-0.5">
              <span className="text-primary font-extrabold text-xl md:text-2xl leading-none">
                {/* TODO: substituir pela nota real do Google ex: ★ 4.9 */}
                ★ [X]
              </span>
              <span className="text-white/50 text-[11px] uppercase tracking-wider">
                {/* TODO: substituir pelo nº real de avaliações ex: 247 avaliações */}
                [N] avaliações Google
              </span>
            </div>
          </motion.div>

          {/* Selos das marcas parceiras — monocromático branco */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col gap-2 mt-4"
          >
            <span className="text-white/35 text-[9px] uppercase tracking-[0.25em] font-semibold">
              ARTISTA E EMBAIXADOR OFICIAL
            </span>
            <div className="flex items-center gap-6">
              {/* Mirra Cosméticos — texto logo (substituir por <Image> quando tiver logo vetorial) */}
              <a
                href="https://www.instagram.com/mirracosmeticos/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white/100 transition-opacity duration-300 text-[11px] font-bold tracking-[0.15em] uppercase"
                aria-label="Mirra Cosméticos — 514 mil seguidores"
              >
                MIRRA COSMÉTICOS
              </a>
              <span className="text-white/20 text-lg">·</span>
              {/* Maison Visage — texto logo */}
              <a
                href="https://www.instagram.com/maisonvisage/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white/100 transition-opacity duration-300 text-[11px] font-bold tracking-[0.15em] uppercase"
                aria-label="Maison Visage — 238 mil seguidores"
              >
                MAISON VISAGE
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ===== CONTEÚDO: escala 0.93, hero fica 100% natural ===== */}
      <div className="scale-[0.93] xl:scale-[0.95] 2xl:scale-100 transform-origin-top">

      {/* ===== BENTO GRID: pilares ===== */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-6">
          <SectionTitle title="Nossos Pilares" subtitle="A essência da marca" align="center" />
          <BentoGrid cards={pillars} />
        </div>
      </section>

      {/* ===== AUTORIDADE COM PARALLAX ===== */}
      <section className="py-16 overflow-hidden">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <Reveal className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 shadow-2xl lg:col-span-5 max-w-md mx-auto w-full">
            <Image
              src="/agnaldo4.webp"
              alt="Agnaldo Gomes"
              fill
              className="object-cover object-[center_20%]"
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
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                +30 anos <br />
                <span className="text-gradient">transformando vidas pela beleza</span>
              </h2>
            </StaggerItem>
            <StaggerItem>
              <p className="text-foreground/80 text-base leading-relaxed">
                Sou <strong>Agnaldo Gomes</strong> — cabeleireiro, educador, esposo da Ana Mary e pai do Gabriel e do Matheus. Minha história com a beleza começou aos 13 anos, e hoje, com mais de três décadas de experiência, descobri que minha missão vai muito além de transformar cabelos.
              </p>
            </StaggerItem>
            <StaggerItem>
              <p className="text-foreground/80 text-base leading-relaxed">
                Uma das minhas maiores paixões é <strong>ensinar</strong>. Amo dar aulas, compartilhar técnicas, dividir experiências e levar conhecimento para outros profissionais que também sonham em crescer na área da beleza.
              </p>
            </StaggerItem>
            <StaggerItem>
              <p className="text-foreground/80 italic text-sm border-l-2 border-primary pl-4 text-foreground/60">
                ✨ Beleza transforma. Conhecimento multiplica.
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="flex gap-4 mt-2 flex-col sm:flex-row">
                <Link href="/academy">
                  <Button variant="primary" size="lg" className="uppercase tracking-widest text-sm">
                    Conheça os Cursos
                  </Button>
                </Link>
                <Link href="/sobre">
                  <Button variant="outline" size="lg" className="uppercase tracking-widest text-sm">
                    Minha História
                  </Button>
                </Link>
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

{/* ===== ARTISTA DAS MARCAS ===== */}
      <section id="artista-das-marcas" className="relative py-16 overflow-hidden border-y border-[var(--border-subtle)]">
        <CarouselBackground />
        <div className="container relative z-10 mx-auto px-6">
          <SectionTitle title="Artista das Marcas" subtitle="Embaixador técnico de referência" align="center" />
          <p className="text-center text-foreground/60 text-sm mb-10 max-w-2xl mx-auto">
            Agnaldo Gomes atua como artista e embaixador das marcas que impulsionam seu trabalho e sua missão de compartilhar beleza e conhecimento.
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
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-6">
          <SectionTitle title="O que oferecemos" subtitle="Excelência em cada detalhe" align="center" />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="md:col-span-1">
                  <div className="glass p-6 rounded-2xl flex flex-col gap-3 text-center items-center hover:bg-primary/5 transition-colors h-full">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Icon size={22} />
                    </div>
                    <h3 className="text-base font-serif font-bold tracking-tight text-foreground">{s.name}</h3>
                    <p className="text-[12.5px] text-foreground/65">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== DEPOIMENTOS ===== */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <Reveal>
            <SectionTitle title="O que dizem" subtitle="Prova Social" align="center" />
          </Reveal>
          <Stagger className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" amount={0.2}>
            {[
              { name: 'Marina S.', city: 'São Paulo, SP', text: 'A experiência no studio é surreal. O atendimento, a técnica e o resultado superaram todas as minhas expectativas. Recomendo de olhos fechados!' },
              { name: 'Carlos E.', city: 'Santos, SP', text: 'Fiz o curso de visagismo na Academy e foi transformador. Saí preparado para atender com confiança e técnica de elite.' },
              { name: 'Juliana R.', city: 'Campinas, SP', text: 'O Agnaldo entende de rosto e essência. Cada corte valorizou aquilo que eu nem sabia que tinha. Simplesmente impecável.' },
            ].map((t, i) => (
              <StaggerItem key={i}>
                <div className="glass p-6 rounded-2xl flex flex-col gap-4 h-full">
                  <div className="flex text-primary gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={18} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-foreground/80 italic leading-relaxed">“{t.text}”</p>
                  <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">
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
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <Stagger className="flex flex-col items-center gap-6">
            <StaggerItem>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Seja muito <span className="text-gradient">bem-vindo!</span>
              </h2>
            </StaggerItem>
            <StaggerItem>
              <p className="text-foreground/70 text-base max-w-xl">
                Este é um espaço para compartilhar trajetória, trabalhos, cursos, técnicas e tudo que aprendi em mais de três décadas dedicadas à profissão.
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link href="/agendamento">
                  <Button variant="primary" size="lg" className="uppercase tracking-widest text-sm w-full sm:w-auto">
                    Agendar no Studio
                  </Button>
                </Link>
                <Link href="/academy">
                  <Button variant="outline" size="lg" className="uppercase tracking-widest text-sm w-full sm:w-auto">
                    Explorar a Academy
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
