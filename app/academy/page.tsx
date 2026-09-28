'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Scissors, Droplets, Palette, Sparkles, UserRound, Briefcase, Trophy, ChevronRight, X, Calendar } from 'lucide-react';
import { CursoCard, CursoCardProps } from '@/components/academy/CursoCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { motion, Variants } from 'framer-motion';

interface CursoVenda {
  id: string;
  title: string;
  titulo: string;
  tituloPdf: string;
  description: string;
  thumbnail_url: string | null;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  descricao?: string;
  conteudo: string[];
  formato: string;
  certificado: boolean;
  destaque?: boolean;
  investimento?: { label: string; valor: string }[];
  price?: number;
  original_price?: number;
  current_price?: number;
  stripe_payment_link?: string;
  hotmart_link?: string;
  enrolled?: boolean;
  purchasable?: boolean;
}

const cursosVenda: CursoVenda[] = [
  {
    id: 'formacao-cortes',
    title: 'Formacao em Cortes',
    titulo: 'Formacao em Cortes',
    tituloPdf: 'FORMAÇÃO EM CORTES',
    icon: Scissors,
    description: 'Cortar cabelo é pura matemática. Deep dive em cortes estonteantes e precisão com domínio de ângulos.',
    conteudo: [
      'Cabelo longo reto e curto',
      'Pixie Cut, Butterfly, Bob Cut, Undercut e Shaggy',
      'Tecnicas e precisao em angulos',
      'Como escolher o corte ideal para cada rosto',
      'Transicao entre estilos e manutencao do corte',
    ],
    formato: 'Presencial · 24h',
    certificado: true,
    destaque: true,
    thumbnail_url: null,
    investimento: [
      { label: 'VIP · 1 pessoa', valor: 'R$ 3.800' },
      { label: 'VIP · 3 pessoas', valor: 'R$ 2.800' },
      { label: 'Curso 24h (2h/semana)', valor: 'R$ 4.800' },
    ],
    price: 4800,
    original_price: 6000,
    enrolled: false,
    purchasable: true,
    stripe_payment_link: '',
    hotmart_link: '',
  },
  {
    id: 'tecnica-lavatorio',
    title: 'Tecnica de Lavatorio',
    titulo: 'Tecnica de Lavatorio',
    tituloPdf: 'TÉCNICA DE LAVATÓRIO',
    icon: Droplets,
    description: 'Transforme o momento do lavatório em uma experincia única e memorável para o cliente.',
    conteudo: ['Massagem capilar relaxante', 'Prevencao de lesoes e ergonomia', 'Experiencia de luxo e conexao com o cliente', 'Tratamentos capilares especificos', 'Tecnicas de lavagem'],
    formato: 'Presencial · 6h',
    certificado: true,
    thumbnail_url: null,
    price: 1200,
    original_price: 1500,
    enrolled: false,
    purchasable: true,
    stripe_payment_link: '',
    hotmart_link: '',
  },
  {
    id: 'colorimetria-avancada',
    title: 'Colorimetria Avancada',
    titulo: 'Colorimetria Avancada',
    tituloPdf: 'COLORIMETRIA',
    icon: Palette,
    description: 'Domine a teoria das cores e crie tons perfeitos para cada cliente, evitando danos aos fios.',
    conteudo: ['Teoria das cores e identificacao de tons', 'Mistura de pigmentos', 'Tecnicas de descolagem', 'Correcao de cor e manutencao', 'Cuidados pos-coloracao'],
    formato: 'Presencial · 6h',
    certificado: true,
    thumbnail_url: null,
    price: 1500,
    original_price: 2000,
    enrolled: false,
    purchasable: true,
    stripe_payment_link: '',
    hotmart_link: '',
  },
  {
    id: 'escova-perfeita',
    title: 'Escova Perfeita',
    titulo: 'Escova Perfeita',
    tituloPdf: 'ESCOBAÇÃO PERFEITA',
    icon: Sparkles,
    description: 'Domine escova beach wave e enrolada, transformando cada escova em uma obra-prima para o seu cliente.',
    conteudo: ['Escova Beach Waver e escova enrolada', 'Técnicas modernas de escovação', 'Primeiro para cada tipo de cabelo', 'Precisao e criatividade', 'Penteados incríveis'],
    formato: 'Presencial · 6h',
    certificado: true,
    thumbnail_url: null,
    price: 1300,
    original_price: 1700,
    enrolled: false,
    purchasable: true,
    stripe_payment_link: '',
    hotmart_link: '',
  },
  {
    id: 'barbearia',
    title: 'Barbearia',
    titulo: 'Barbearia',
    tituloPdf: 'BARBEARIA',
    icon: UserRound,
    description: 'Torne-se referência para o estilo masculino: fades, degradê, navalha e visagismo masculino.',
    conteudo: ['Tecnicas de fade e degradê', 'Técnica de corte masculino', 'Uso de navalha e tesoura', 'Visagismo masculino e acabamento', 'Higiene e cuidados'],
    formato: 'Presencial · 6h',
    certificado: true,
    thumbnail_url: null,
    price: 1200,
    original_price: 1500,
    enrolled: false,
    purchasable: true,
    stripe_payment_link: '',
    hotmart_link: '',
  },
  {
    id: 'gestao-salao',
    title: 'Gestao de Salao',
    titulo: 'Gestao de Salao',
    tituloPdf: 'GESTÃO DE SALÃO',
    icon: Briefcase,
    description: 'Capacite-se para gerenciar seu salão com eficiência, rentabilidade e crescimento sustentável.',
    conteudo: ['Analise de custos e margem de lucro', 'Precificacao dos servicos', 'Estrutura de comissionamento', 'Ferramentas e softwares de gestao', 'Capacitacao e monitoramento de resultados'],
    formato: 'Online · 8h',
    certificado: false,
    thumbnail_url: null,
    price: 997,
    original_price: 1497,
    enrolled: false,
    purchasable: true,
    stripe_payment_link: '',
    hotmart_link: '',
  },
];

// Animação de entrada (scroll reveal) — tipada para Framer Motion
const fadeInUp: Variants = {
  initial: { opacity: 0, y: 32, filter: 'blur(2px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

const stagger: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

export default function AcademyPage() {
  const [enrolledMap, setEnrolledMap] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [dbCursos, setDbCursos] = useState<any[]>([]);
  const [selectedVipCourse, setSelectedVipCourse] = useState<any | null>(null);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  
  // Cursos online (buscados diretamente do Supabase Client para simplificar a demo, mas ideal via API)
  const [onlineCursos, setOnlineCursos] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = await import('@/lib/supabase/client').then(m => m.supabase);
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setProfile({ id: userData.user.id, email: userData.user.email || '' });
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('user_id', userData.user.id);
        const map: Record<string, boolean> = {};
        if (enrollments) {
          enrollments.forEach((e: { course_id: string }) => { map[e.course_id] = true; });
        }
        setEnrolledMap(map);
      }
      
      try {
        const res = await fetch('/api/public/cursos-vip');
        if (res.ok) {
          const data = await res.json();
          setDbCursos(data || []);
        }

        // Fetch online courses from database
        const { data: onlineData } = await supabase
          .from('courses')
          .select('*')
          .eq('is_published', true);
        
        if (onlineData) {
          setOnlineCursos(onlineData);
        }
      } catch (err) {
        console.error('Erro ao buscar cursos:', err);
      }
      
      setLoading(false);
    })();
  }, []);

  // Combinar os cursos online do banco de dados com os VIPs
  const vipMapped = dbCursos.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail_url: c.thumbnail_url,
    price: c.price,
    original_price: c.original_price,
    destaque: c.is_featured,
    isVip: true,
    schedules: c.schedules || [],
    purchasable: true,
    enrolled: false,
  }));

  const onlineMapped = onlineCursos.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail_url: c.thumbnail_url,
    price: c.price,
    original_price: c.original_price,
    destaque: false,
    isVip: false,
    schedules: [],
    purchasable: !enrolledMap[c.id],
    enrolled: !!enrolledMap[c.id],
  }));

  const cursosComStatus = [
    ...vipMapped,
    ...onlineMapped
  ];

  // Seção separa cursos em "Cursos em Destaque" (destaque: true) do resto
  const destaqueComStatus = cursosComStatus.filter(c => c.destaque && c.purchasable) as (CursoVenda & { enrolled: boolean; purchasable: boolean })[];
  const complementaresComStatus = cursosComStatus.filter(c => !c.destaque) as (CursoVenda & { enrolled: boolean; purchasable: boolean })[];

  return (
    <div className="flex flex-col w-full bg-background text-foreground min-h-screen">
      {/* Hero */}
      <section className="relative w-full min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image src="/agnaldo_hero.jpg" alt="Agnaldo Gomes - Academy" fill priority fetchPriority="high" className="object-cover object-center" sizes="100vw" />
          {/* Overlay escuro com tom dourado quente para leitura do texto */}
          <div className="absolute inset-0 bg-foreground/60" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-foreground/50 to-foreground/30" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-b from-gold/10 via-gold/5 to-transparent" aria-hidden />
        </div>
        <div className="relative z-10 container mx-auto px-6 text-center py-32 md:py-40">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="text-gold font-semibold tracking-[0.2em] uppercase text-xs mb-4 inline-block"
          >
            Formacao e Educacao de Elite
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.1 }}
            className="font-serif font-black text-5xl md:text-6xl lg:text-7xl text-foreground tracking-tight leading-none drop-shadow-lg"
          >
            Academy <span className="italic text-gold font-light">AG</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.2 }}
            className="mt-6 max-w-2xl mx-auto text-foreground/90 text-base md:text-lg leading-relaxed drop-shadow-md"
          >
            <strong>Agnaldo Gomes</strong> — 30 anos de experiencia, formado nas academias{' '}
            <strong className="text-gold">Pivot Point, Toni & Guy e Llongueras</strong>.
            Cursos presenciais e online que formam profissionais de elite e elevam o faturamento do seu salao.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => {
                document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center bg-gold text-foreground px-8 py-3.5 rounded-md uppercase tracking-widest text-xs font-bold hover:bg-gold-dim hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-lg shadow-gold/25 focus:outline-none focus:ring-2 focus:ring-gold group"
            >
              <span className="flex items-center gap-1.5">
                Quero me Inscrever
                <span className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                  <ChevronRight size={12} className="text-foreground" />
                </span>
              </span>
            </button>
            <Link href="/sobre">
              <button className="inline-flex items-center justify-center border border-gold/30 text-foreground px-8 py-3.5 rounded-md uppercase tracking-widest text-xs font-bold hover:bg-gold/10 hover:border-gold hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:outline-none focus:ring-2 focus:ring-gold" type="button">
                Conhecer o Formador
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Catalogo */}
      <div id="catalogo" className="container mx-auto px-6 pt-24 pb-16">
        {destaqueComStatus.length > 0 && (
          <>
            {/* Eyebrow tag + title — Double-Bezel container */}
            <div className="flex items-baseline justify-between mb-10">
              <div>
                <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-gold/80 bg-gold/5 mb-2">
                  Edicao 2026
                </span>
                <h2 className="text-2xl font-serif font-bold text-gold mb-1">Cursos em Destaque</h2>
                <p className="text-sm text-foreground/70">Formacao e Educacao de Elite</p>
              </div>
            </div>

            {/* Carrossel horizontal scrollable — Netflix-style */}
            <motion.div
              variants={stagger}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide mb-16"
            >
              {destaqueComStatus.map((c) => (
                <motion.div
                  key={c.id}
                  className="snap-start w-72 sm:w-80 flex-shrink-0"
                  variants={fadeInUp}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                >
                  <div className="relative group">
                    {/* Badge de destaque */}
                    {c.destaque && (
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/30 text-foreground text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                        <Trophy size={10} className="text-gold" /> Destaque
                      </div>
                    )}
                    <CursoCard
                      curso={{
                        id: c.id,
                        title: c.title,
                        description: c.description,
                        thumbnail_url: c.thumbnail_url,
                        price: c.price,
                        original_price: c.original_price,
                        current_price: c.current_price,
                        stripe_payment_link: c.stripe_payment_link,
                        hotmart_link: c.hotmart_link,
                        isVip: c.isVip,
                        schedules: c.schedules,
                      }}
                      isPurchasable={c.purchasable}
                      isEnrolled={c.enrolled}
                      onVipSelect={(curso) => {
                        setSelectedVipCourse(c);
                        setIsVipModalOpen(true);
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* Todos os Cursos — grid responsivo separado */}
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="flex items-baseline justify-between mb-10"
        >
          <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-gold/80 bg-gold/5 mb-2">
              Formacao Completa
            </span>
            <h2 className="text-2xl font-serif font-bold text-gold mb-1">Todos os Cursos</h2>
            <p className="text-sm text-foreground/70">Formacao completa para transformar sua carreira</p>
          </motion.div>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          {complementaresComStatus.map((c) => (
            <motion.div
              key={c.id}
              variants={fadeInUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
            >
              <CursoCard
                curso={{
                  id: c.id,
                  title: c.title,
                  description: c.description,
                  thumbnail_url: c.thumbnail_url,
                  price: c.price,
                  original_price: c.original_price,
                  current_price: c.current_price,
                  stripe_payment_link: c.stripe_payment_link,
                  hotmart_link: c.hotmart_link,
                  isVip: c.isVip,
                  schedules: c.schedules,
                }}
                isPurchasable={c.purchasable}
                isEnrolled={c.enrolled}
                onVipSelect={(curso) => {
                  setSelectedVipCourse(c);
                  setIsVipModalOpen(true);
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Ficha do formador */}
      <div className="bg-foreground/[0.03] border border-gold/20 rounded-3xl p-10 max-w-4xl mx-auto mb-16">
        <div className="flex flex-col gap-4 text-foreground/75 text-center">
          <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
            <svg className="text-gold" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 15 23 16.79 13.88" /></svg>
            Sobre o Formador
          </h3>
          <p className="leading-relaxed max-w-2xl mx-auto">
            Especialista em cortes, coloracao e mechas, formado nas academias <strong className="text-gold">Pivot Point, Toni & Guy e Llongueras</strong>. Iniciou a carreira aos 13 anos, com <strong>mais de 30 anos de experiencia</strong>, sendo um educador apaixonado por repassar tecnicas de elite.
          </p>
          <p className="flex items-center justify-center gap-2 text-sm text-foreground/80">
            <svg className="text-gold" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
            Rua Prof. Otília Macedo Sikorski, 16 — Telêmaco Borba · PR
          </p>
        </div>
      </div>

      {/* Modal de Agendamento VIP */}
      <Modal isOpen={isVipModalOpen} onClose={() => setIsVipModalOpen(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Agendar Curso VIP</h2>
            <button onClick={() => setIsVipModalOpen(false)} className="p-2 text-foreground/50 hover:bg-white/5 rounded-full">
              <X size={20} />
            </button>
          </div>
          
          <p className="text-sm text-foreground/80 mb-6">
            Você está se inscrevendo para <strong>{selectedVipCourse?.title}</strong>.<br/>
            Por favor, selecione a data desejada para prosseguirmos com sua inscrição.
          </p>

          <div className="space-y-4">
            {selectedVipCourse?.schedules?.length > 0 ? (
              selectedVipCourse.schedules.map((sched: any) => (
                <div key={sched.id} className="p-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--background)] hover:border-gold/50 cursor-pointer transition-colors flex items-center justify-between" onClick={() => window.location.href = `/academy/checkout-vip/${selectedVipCourse.id}?schedule=${sched.id}`}>
                  <div>
                    <div className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Calendar size={14} className="text-gold" /> {new Date(sched.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </div>
                    <div className="text-xs text-foreground/60 mt-1">Horário: {sched.time || 'A definir'} • Local: {sched.location || 'A definir'}</div>
                  </div>
                  <Button variant="primary" className="text-xs py-1.5 px-3">
                    Selecionar
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center p-6 bg-white/5 rounded-lg border border-[var(--border-subtle)]">
                <p className="text-foreground/60 text-sm">Nenhuma data com vagas abertas no momento.</p>
                <p className="text-foreground/40 text-xs mt-2">Entre em contato para abrir uma turma.</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
}
