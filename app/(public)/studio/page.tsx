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
      name: "Cortes Masculinos",
      preco: "A partir de R$ 50",
      detalhe: "R$ 60 com Agnaldo · R$ 50 com equipe",
      icon: User,
      desc: "Estilo, visagismo e precisão para o visual masculino moderno.",
      grupo: "Cortes",
    },
    {
      name: "Cortes Femininos",
      preco: "A partir de R$ 140",
      detalhe: "R$ 140 corte · R$ 160 com escova",
      icon: Scissors,
      desc: "Cortes personalizados com visagismo para valorizar seus traços únicos.",
      grupo: "Cortes",
    },
    {
      name: "Mechas & Morena Iluminada",
      preco: "De R$ 480 a R$ 1.080",
      detalhe: "Técnicas exclusivas e preservação da saúde dos fios",
      icon: Sparkles,
      desc: "Loiras deslumbrantes, morenas iluminadas e mechas com colorimetria de precisão.",
      grupo: "Coloração",
    },
    {
      name: "Coloração",
      preco: "De R$ 160 a R$ 580",
      detalhe: "Cores vibrantes e cobertura perfeita",
      icon: Sparkles,
      desc: "Tonalização e coloração profissional com pigmentos de alta fixação e brilho.",
      grupo: "Coloração",
    },
    {
      name: "Hidratação & Reconstrução",
      preco: "A partir de R$ 95",
      detalhe: "Hidratação R$ 95 · Reconstrução R$ 120 · Selamento R$ 120",
      icon: Droplets,
      desc: "Reposição hídrica, lipídica e de massa com produtos de alta performance.",
      grupo: "Tratamentos",
    },
    {
      name: "Terapia Capilar & Micro Mist",
      preco: "De R$ 160 a R$ 420",
      detalhe: "Ozônio R$ 160 · Micro Mist R$ 180 · Terapia Capilar personalizada até R$ 420",
      icon: Droplets,
      desc: "Tratamento avançado do couro cabeludo e fibra capilar com tecnologia e vapor.",
      grupo: "Terapia Capilar",
    },
    {
      name: "Escova & Penteado",
      preco: "A partir de R$ 45",
      detalhe: "Escova R$ 45 · Penteado R$ 140",
      icon: Scissors,
      desc: "Finalização impecável para o dia a dia, eventos e ocasiões especiais.",
      grupo: "Finalização",
    },
    {
      name: "Barba",
      preco: "A partir de R$ 45",
      detalhe: "Alinhamento e acabamento perfeito",
      icon: User,
      desc: "Modelagem, hidratação e cuidado tradicional com a barba.",
      grupo: "Barbearia",
    },
    {
      name: "Unhas & Podologia",
      preco: "A partir de R$ 40",
      detalhe: "Mão R$ 40 · Pé R$ 45 · Podologia R$ 90",
      icon: Hand,
      desc: "Cuidado e estética das mãos e pés com técnicas de biossegurança.",
      grupo: "Unhas & Pés",
    },
    {
      name: "Maquiagem & Sobrancelha",
      preco: "A partir de R$ 55",
      detalhe: "Sobrancelha R$ 55 · Maquiagem R$ 160",
      icon: Sparkles,
      desc: "Design de sobrancelhas e maquiagens elegantes e duradouras para eventos.",
      grupo: "Face",
    },
    {
      name: "Estética & Drenagem",
      preco: "A partir de R$ 180",
      detalhe: "Drenagem R$ 180 · Limpeza de Pele (sob consulta)",
      icon: Droplets,
      desc: "Drenagem linfática e cuidados faciais para renovar seu bem-estar.",
      grupo: "Estética",
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
        <SectionTitle title="Nossos Serviços" subtitle="Excelência em cada detalhe · Valores sempre a partir de" align="center" />

        <div className="text-center max-w-3xl mx-auto mt-8 mb-16">
          <p className="text-foreground/80 text-base leading-relaxed">
            No Studio Agnaldo Gomes, cada detalhe é pensado para revelar a sua melhor versão.
            Cabelo, estilo e autoestima em um só lugar — com técnicas exclusivas, produtos de alta performance e transparência.
          </p>
        </div>

        {/* Serviços */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {servicos.map((s, i) => (
            <div key={i} className="glass p-6 rounded-2xl flex flex-col justify-between hover:bg-primary/5 transition-all duration-300 border border-primary/15 hover:border-primary/40 group">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <s.icon size={24} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{s.grupo}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-1">{s.name}</h3>
                <p className="text-foreground/70 text-sm leading-relaxed">{s.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex flex-col gap-1">
                <span className="text-primary font-bold text-base font-serif">{s.preco}</span>
                <span className="text-xs text-foreground/50">{s.detalhe}</span>
              </div>
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
