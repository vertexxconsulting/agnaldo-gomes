'use client';

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SectionTitle } from "@/components/SectionTitle";
import { Button } from "@/components/Button";
import { Scissors, Sparkles, Droplets, Hand, Baby, User, Clock, ChevronRight, Crown, Heart, Star, Camera, Users, ShieldCheck } from "lucide-react";
import { NOIVA_PACOTES, formatBRL, NOIVA_SINAL_MIN_PCT } from "@/lib/noivas";

const studioImages = [
  '/agnaldo1.webp',
  '/agnaldo2.webp',
  '/agnaldo5.webp',
  '/agnaldo6.webp',
  '/agnaldo7.webp',
];

function StudioCarouselHero() {
  return (
    <section className="relative w-full min-h-[90vh] flex items-center overflow-hidden">
      {/* Carrossel de fundo — colunas verticais (retrato) transicionando lateralmente */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 flex">
        <motion.div
          className="flex h-full items-stretch"
          style={{ width: 'fit-content' }}
          animate={{ x: ['0%', '-50%'] }}
          transition={{ ease: 'linear', duration: 40, repeat: Infinity }}
        >
          {[...studioImages, ...studioImages].map((src, i) => (
            <div
              key={i}
              className="relative flex-shrink-0 h-full"
              style={{ width: '20vw', minWidth: 200 }}
            >
              <Image
                src={src}
                alt="Studio Agnaldo Gomes"
                fill
                className="object-cover object-center"
                sizes="20vw"
                priority={i < 3}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Overlay gradientes luxury */}
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />

      {/* Conteúdo do Hero */}
      <motion.div
        className="container relative z-10 mx-auto px-6 lg:px-12 flex flex-col items-start text-left gap-5 mt-16"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
        }}
      >
        <motion.span
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          className="text-primary font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs"
        >
          Studio de Beleza
        </motion.span>

        <motion.h1
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight max-w-3xl leading-[1.1]"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/30">
            Excelência em{' '}
          </span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#D4AF37] to-[#AA8529] font-bold italic font-serif">
            Transformar sua Beleza
          </span>
        </motion.h1>

        <motion.p
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          className="text-white/80 text-base md:text-lg max-w-lg font-light leading-relaxed mt-2"
        >
          Técnicas exclusivas, produtos premium e a expertise de +30 anos
          para revelar a sua melhor versão.
        </motion.p>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
          className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto"
        >
          <Link href="/agendamento">
            <Button variant="primary" className="w-full sm:w-auto uppercase tracking-widest text-xs py-3 px-8 shadow-lg shadow-primary/30 flex items-center gap-2">
              Agendar Horário <ChevronRight size={14} />
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

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
    <div className="flex flex-col w-full">
      {/* ===== HERO COM CARROSSEL ===== */}
      <StudioCarouselHero />

      {/* ===== CONTEÚDO ===== */}
      <div className="container mx-auto px-6 py-14">
        <SectionTitle title="Nossos Serviços" subtitle="Excelência em cada detalhe" align="center" />

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

        {/* ===== DIA DA NOIVA ===== */}
        <div className="mb-20">
          <SectionTitle title="Dia da Noiva" subtitle="O grande dia merece um cuidado exclusivo" align="center" />
          <div className="text-center max-w-3xl mx-auto mt-8 mb-10">
            <p className="text-foreground/80 text-base leading-relaxed">
              Pacotes exclusivos de penteado, makeup e acompanhamento completo para o seu casamento.
              <br />
              <span className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-primary">
                <ShieldCheck size={16} />
                Reserva de agenda garantida com sinal mínimo de {NOIVA_SINAL_MIN_PCT}% — sua data fica protegida e bloqueada exclusivamente para você.
              </span>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {NOIVA_PACOTES.map((p) => {
              const Icon = p.id === 'noiva-vip' ? Crown : p.id === 'noiva-dia-completo' ? Heart : p.id === 'noiva-prova' ? Camera : p.id === 'noiva-penteado' ? Star : Users;
              return (
                <div key={p.id} className="relative glass rounded-2xl p-6 flex flex-col gap-3 hover:bg-primary/5 transition-colors border border-primary/15 hover:border-primary/40">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Icon size={22} />
                    </div>
                    <span className="text-2xl font-serif font-bold text-primary">{formatBRL(p.preco)}</span>
                  </div>
                  <h3 className="text-lg font-bold">{p.nome}</h3>
                  <p className="text-foreground/70 text-sm leading-relaxed">{p.descricao}</p>
                  <ul className="flex flex-col gap-1.5">
                    {p.itens.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground/70">
                        <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-foreground/50">
                    <span>Duração aprox. {Math.floor(p.duracao_min / 60)}h{p.duracao_min % 60 > 0 ? `${String(p.duracao_min % 60).padStart(2, '0')}` : ''}</span>
                    <span className="font-semibold text-primary">Sinal {NOIVA_SINAL_MIN_PCT}%: {formatBRL((p.preco * NOIVA_SINAL_MIN_PCT) / 100)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Link href="/agendamento">
              <Button variant="primary" size="md" className="px-10 uppercase tracking-widest">
                Agendar Dia da Noiva
              </Button>
            </Link>
            <p className="text-foreground/50 text-xs mt-3">Após a solicitação, nossa equipe entrará em contato para confirmar a data e o sinal.</p>
          </div>
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
