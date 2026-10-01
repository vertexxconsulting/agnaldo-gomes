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
    thumbnail_url: '/cursos/cortes.jpg',
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
    thumbnail_url: '/cursos/lavatorio.jpg',
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
    thumbnail_url: '/cursos/colorimetria.jpg',
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
    thumbnail_url: '/cursos/escova.jpg',
    price: 1300,
    original_price: 1700,
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
    thumbnail_url: '/cursos/gestao.jpg',
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

  // A API agora retorna as mesmas datas universais para todos os cursos do banco.
  // Vamos extraí-las do primeiro curso para aplicar nos cursos locais.
  const universalSchedules = dbCursos.length > 0 ? dbCursos[0].schedules || [] : [];

  // Mapear os cursos hardcoded (cursosVenda) para que sempre apareçam
  const hardcodedMapped = cursosVenda.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail_url: c.thumbnail_url,
    price: c.price,
    original_price: c.original_price,
    current_price: c.current_price,
    destaque: c.destaque,
    isVip: true,
    schedules: universalSchedules,
    purchasable: c.purchasable,
    enrolled: c.enrolled,
  }));

  // Combinar os cursos online do banco de dados com os VIPs (BD + Hardcoded)
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

  // Filtra hardcoded que já vieram do banco pelo ID (para não duplicar)
  const dbVipIds = new Set(vipMapped.map(c => c.id));
  const filteredHardcoded = hardcodedMapped.filter(c => !dbVipIds.has(c.id));

  const cursosComStatus = [
    ...filteredHardcoded,
    ...vipMapped,
    ...onlineMapped
  ];

  // Lista todos os cursos na mesma seção
  const complementaresComStatus = cursosComStatus as any;

  return (
    <div className="flex flex-col w-full bg-background text-foreground min-h-screen">
      {/* Hero */}
      <section className="relative w-full min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image src="/agnaldo_hero.jpg" alt="Agnaldo Gomes - Academy" fill priority fetchPriority="high" className="object-cover object-center" sizes="100vw" />
          {/* Overlay escuro uniforme para garantir a leitura */}
          <div className="absolute inset-0 bg-black/60" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" aria-hidden />
        </div>
        <div className="relative z-10 container mx-auto px-6 lg:px-12 py-32 md:py-40 flex flex-col items-start text-left">
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
            className="font-serif font-black text-5xl md:text-6xl lg:text-7xl text-white tracking-tight leading-none drop-shadow-lg"
          >
            Academy <span className="italic text-gold font-light">AG</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.2 }}
            className="mt-6 max-w-xl text-white/90 text-base md:text-lg leading-relaxed drop-shadow-md"
          >
            <strong>Agnaldo Gomes</strong> — 30 anos de experiencia, formado nas academias{' '}
            <strong className="text-gold">Pivot Point, Toni & Guy e Llongueras</strong>.<br className="hidden md:block mt-2" />
            <br className="hidden md:block" />
            Cursos presenciais e online que formam profissionais de elite e elevam o faturamento do seu salao.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-start"
          >
            <button
              onClick={() => {
                document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center bg-gold text-black px-8 py-3.5 rounded-md uppercase tracking-widest text-xs font-bold hover:bg-gold-dim hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-lg shadow-gold/25 focus:outline-none focus:ring-2 focus:ring-gold group"
            >
              <span className="flex items-center gap-1.5">
                Quero me Inscrever
                <span className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                  <ChevronRight size={12} className="text-black" />
                </span>
              </span>
            </button>
            <Link href="/sobre">
              <button className="inline-flex items-center justify-center border border-gold/70 text-white px-8 py-3.5 rounded-md uppercase tracking-widest text-xs font-bold hover:bg-gold/20 hover:border-gold hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:outline-none focus:ring-2 focus:ring-gold" type="button">
                Conhecer o Formador
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Catalogo */}
      <div id="catalogo" className="container mx-auto px-6 pt-24 pb-16">


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
          {complementaresComStatus.map((c: any) => (
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
      <Modal isOpen={isVipModalOpen} onClose={() => setIsVipModalOpen(false)} title="Agendar Curso VIP">
        <div className="p-0">
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
                      {sched.available_spots === 1 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gold/20 text-gold uppercase tracking-wider">VIP Individual</span>
                      )}
                    </div>
                    <div className="text-xs text-foreground/60 mt-1">Horário: {sched.time || 'A definir'} • Local: {sched.location || 'A definir'}</div>
                  </div>
                  <Button variant="gold" className="text-xs py-1.5 px-3">
                    Selecionar
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center p-6 bg-foreground/[0.02] rounded-lg border border-[var(--border-subtle)]">
                <p className="text-foreground/80 text-sm font-medium mb-2">Nenhuma data com vagas abertas no momento.</p>
                <a 
                  href={`https://wa.me/5542991295941?text=${encodeURIComponent(`Olá! Tenho interesse em abrir uma turma para o curso VIP: ${selectedVipCourse?.title}. Podemos conversar?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-gold hover:text-gold-dim transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.47-1.761-1.643-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                  </svg>
                  Conversar no WhatsApp para abrir turma
                </a>
              </div>
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
}
