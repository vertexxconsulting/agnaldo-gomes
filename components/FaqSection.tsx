'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';

interface FaqItem {
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FaqItem[] = [
  {
    question: 'Como funciona o agendamento no Studio?',
    answer:
      'É simples: escolha o serviço desejado, selecione o horário disponível e confirme. Nosso time confirma o agendamento pelo WhatsApp. Atendemos por ordem de agendamento e priorizamos retornos para manutenção.',
  },
  {
    question: 'Os cursos da Academy exigem experiência prévia?',
    answer:
      'Não. Temos turmas desde o nível iniciante até o avançado. Cada aluno passa por uma avaliação e é direcionado à formação mais adequada ao seu momento profissional.',
  },
  {
    question: 'Posso parcelar os cursos ou serviços?',
    answer:
      'Sim. Oferecemos condições de parcelamento no cartão para cursos e pacotes de serviços do Studio. Consulte as condições na página da Academy ou pelo WhatsApp.',
  },
  {
    question: 'Os cursos online dão certificado?',
    answer:
      'Sim. Todos os cursos, presenciais e online, emitem certificado de conclusão reconhecido, assinado pelo Agnaldo Gomes.',
  },
  {
    question: 'Qual a política de reagendamento e cancelamento?',
    answer:
      'Você pode reagendar ou cancelar com até 24h de antecedência sem custo. Em cima da hora, cobramos uma taxa simbólica para compensar o horário reservado.',
  },
];

/**
 * FAQ com animação plus/minus — acordeão expansível com easing premium
 * (padrão motion.dev "faq-plus-minus").
 */
export function FaqSection({ faqs = DEFAULT_FAQS, title = 'Perguntas Frequentes', subtitle = 'Tire suas dúvidas' }: { faqs?: FaqItem[]; title?: string; subtitle?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <SectionTitle title={title} subtitle={subtitle} align="center" />
        <div className="mt-12 flex flex-col gap-4">
          {faqs.map((item, i) => {
            const open = openIndex === i;
            return (
              <div
                key={i}
                className="glass rounded-2xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left"
                  aria-expanded={open}
                >
                  <span className="text-lg font-semibold text-foreground">{item.question}</span>
                  <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="shrink-0 text-primary"
                  >
                    <Plus size={24} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-foreground/70 leading-relaxed">{item.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}