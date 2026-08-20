import Link from "next/link";
import Image from "next/image";
import { SectionTitle } from "@/components/SectionTitle";
import { Button } from "@/components/Button";
import { Scissors, Palette, Sparkles, UserRound, Droplets, Briefcase, Award, Clock, MapPin, BadgeCheck } from "lucide-react";

interface Curso {
  titulo: string;
  tituloPdf: string;
  descricao: string;
  icon: typeof Scissors;
  conteudo: string[];
  formato: string;
  certificado: boolean;
  destaque?: boolean;
  investimento?: { label: string; valor: string }[];
}

const cursos: Curso[] = [
  {
    titulo: "Formação em Cortes",
    tituloPdf: "FORMAÇÃO EM CORTES",
    icon: Scissors,
    descricao: "Cortar cabelo é pura matemática. Deep dive em cortes estonteantes e precisão com domínio de ângulos.",
    conteudo: [
      "Cabelo longo reto e curto",
      "Pixie Cut, Butterfly, Bob Cut, Undercut e Shaggy",
      "Técnica e precisão em ângulos",
      "Como escolher o corte ideal para cada rosto",
      "Transição entre estilos e manutenção do corte",
    ],
    formato: "Presencial · 24h",
    certificado: true,
    destaque: true,
    investimento: [
      { label: "VIP · 1 pessoa", valor: "R$ 3.800" },
      { label: "VIP · 3 pessoas", valor: "R$ 2.800" },
      { label: "Curso 24h (2h/semana)", valor: "R$ 4.800" },
    ],
  },
  {
    titulo: "Técnica de Lavatório",
    tituloPdf: "TÉCNICA DE LAVATÓRIO",
    icon: Droplets,
    descricao: "Transforme o momento do lavatório em uma experiência única e memorável para o cliente.",
    conteudo: [
      "Massagem capilar relaxante",
      "Prevenção de lesões e ergonomia",
      "Experiência de luxo e conexão com o cliente",
      "Tratamentos capilares específicos",
      "Técnicas de lavagem",
    ],
    formato: "Presencial · 6h",
    certificado: true,
  },
  {
    titulo: "Colorimetria Avançada",
    tituloPdf: "COLORIMETRIA",
    icon: Palette,
    descricao: "Domine a teoria das cores e crie tons perfeitos para cada cliente, evitando danos aos fios.",
    conteudo: [
      "Teoria das cores e identificação de tons",
      "Mistura de pigmentos",
      "Técnicas de descoloração",
      "Correção de cor e manutenção",
      "Cuidados pós-coloração",
    ],
    formato: "Presencial · 6h",
    certificado: true,
  },
  {
    titulo: "Escova Perfeita",
    tituloPdf: "ESCOVAÇÃO PERFEITA",
    icon: Sparkles,
    descricao: "Domine escova beach wave e enrolada, transformando cada escova em uma obra-prima para o seu cliente.",
    conteudo: [
      "Escova Beach Waver e escova enrolada",
      "Técnicas modernas de escovação",
      "Primeiro para cada tipo de cabelo",
      "Precisão e criatividade",
      "Penteados incríveis",
    ],
    formato: "Presencial · 6h",
    certificado: true,
  },
  {
    titulo: "Barbearia",
    tituloPdf: "BARBEARIA",
    icon: UserRound,
    descricao: "Torre-se referência para o estilo masculino: fades, degradê, navalha e visagismo masculino.",
    conteudo: [
      "Técnicas de fade e degradê",
      "Técnica de corte masculino",
      "Uso de navalha e tesoura",
      "Visagismo masculino e acabamento",
      "Higiene e cuidados",
    ],
    formato: "Presencial · 6h",
    certificado: true,
  },
  {
    titulo: "Gestão de Salão",
    tituloPdf: "GESTÃO DE SALÃO",
    icon: Briefcase,
    descricao: "Capacite-se para gerenciar seu salão com eficiência, rentabilidade e crescimento sustentável.",
    conteudo: [
      "Analise de custos e margem de lucro",
      "Precificação dos serviços",
      "Estrutura de comissionamento",
      "Ferramentas e softwares de gestão",
      "Capacitação e monitoramento de resultados",
    ],
    formato: "Online · 8h",
    certificado: false,
  },
];

export default function AcademyPage() {
  return (
    <div className="flex flex-col w-full bg-background">
      {/* Hero */}
      <section className="relative w-full min-h-[56vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/agnaldo3.webp"
            alt="Agnaldo Gomes — Academy"
            fill
            className="object-cover object-top"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-background" />
        </div>
        <div className="container relative z-10 mx-auto px-6 text-center py-24">
          <p className="text-primary font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs">
            Formação e Educação de Elite
          </p>
          <h1 className="mt-4 font-serif font-bold text-4xl md:text-6xl text-white tracking-tight">
            Academy <span className="italic text-primary">AG</span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-white/80 text-base leading-relaxed">
            <strong>Agnaldo Gomes</strong> — 30 anos de experiência, formado nas academias{" "}
            <strong>Pivot Point, Toni &amp; Guy e Llongueras</strong>.{" "}
            Cursos presenciais e online que formam profissionais de elite e elevam o faturamento do seu salão.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/academy/login">
              <Button variant="primary" className="uppercase tracking-widest text-xs px-8">
                Quero me Inscrever
              </Button>
            </Link>
            <Link href="/sobre">
              <Button variant="outline" className="uppercase tracking-widest text-xs px-8 border-white/30 text-white hover:bg-white/10 hover:border-white/60">
                Conhecer o Formador
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Catálogo de cursos */}
      <div className="container mx-auto px-6 pt-14">
        <SectionTitle title="Catálogo de Cursos" subtitle="Formação e Educação de Elite" align="center" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {cursos.map((c, i) => (
            <div
              key={i}
              className={`glass p-8 rounded-2xl flex flex-col gap-5 relative overflow-hidden group ${
                c.destaque ? "border border-primary/50" : "border-t-2 border-t-primary/50"
              }`}
            >
              {c.destaque && (
                <div className="absolute top-4 right-4 bg-primary text-background text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  Mais procurado
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                  <c.icon size={30} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold">{c.titulo}</h3>
                  {c.formato && (
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/80">{c.formato}</span>
                  )}
                </div>
              </div>

              <p className="text-foreground/75 leading-relaxed">{c.descricao}</p>

              <ul className="flex flex-col gap-2">
                {c.conteudo.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-foreground/70">
                    <BadgeCheck className="text-primary shrink-0 mt-0.5" size={16} />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3 mt-2 pt-4 border-t border-white/10">
                <Clock size={16} className="text-primary" />
                <span className="text-xs text-foreground/60">{c.formato}</span>
                <span className="text-primary">·</span>
                <span className="text-xs text-foreground/60">
                  {c.certificado ? "✓ Certificado de conclusão" : "✓ Disponível em formato online"}
                </span>
              </div>

              {c.investimento && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                  {c.investimento.map((inv, k) => (
                    <div key={k} className="bg-[var(--color-card)] border border-primary/20 rounded-xl p-3 text-center">
                      <div className="text-xs text-foreground/60 uppercase tracking-wider">{inv.label}</div>
                      <div className="text-lg font-bold text-primary mt-1">{inv.valor}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Localização / Ficha */}
        <div className="bg-card/40 border border-primary/20 rounded-3xl p-10 max-w-4xl mx-auto mb-16">
          <div className="flex flex-col gap-4 text-foreground/80 text-center">
            <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Award className="text-primary" size={26} /> Sobre o Formador
            </h3>
            <p className="leading-relaxed max-w-2xl mx-auto">
              Especialista em cortes, coloração e mechas, formado nas academias{" "}
              <strong>Pivot Point, Toni &amp; Guy e Llongueras</strong>. Iniciou a carreira aos 13 anos,
              com <strong>mais de 30 anos de experiência</strong>, sendo um educador apaixonado por repassar técnicas de elite.
            </p>
            <p className="flex items-center justify-center gap-2 text-sm text-foreground/60">
              <MapPin size={16} className="text-primary" /> Rua Prof.ª Otília Macedo Sikorski, 16 — Telêmaco Borba · PR
            </p>
          </div>
        </div>

        <div className="bg-card/40 border border-primary/20 rounded-3xl p-10 text-center max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-3">Formação que transforma carreiras</h3>
          <p className="text-foreground/70 mb-8 max-w-2xl mx-auto text-sm">
            Vagas limitadas por turma para garantir atenção individualizada. Preencha o formulário para garantir sua vaga.
          </p>
          <Link href="/academy/login">
            <Button variant="primary" size="lg" className="uppercase tracking-widest">
              Acessar Área do Aluno
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
