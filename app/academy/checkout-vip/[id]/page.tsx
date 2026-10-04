'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Check, Calendar, MapPin, Clock, Loader2, ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutVIP() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const scheduleId = searchParams.get('schedule');

  const [course, setCourse] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!courseId || !scheduleId) {
        setError('Dados incompletos.');
        setLoading(false);
        return;
      }

      try {
        const [courseRes, schedRes, settingsRes] = await Promise.all([
          supabase.from('academy_vip_courses').select('*').eq('id', courseId).single(),
          supabase.from('academy_vip_schedules').select('*').eq('id', scheduleId).single(),
          supabase.from('academy_settings').select('whatsapp_number').eq('id', 1).single(),
        ]);

        if (courseRes.error) throw courseRes.error;
        if (schedRes.error) throw schedRes.error;

        setCourse(courseRes.data);
        setSchedule(schedRes.data);
        setSettings(settingsRes.data);
      } catch (err: any) {
        console.error('Error loading checkout data:', err);
        setError('Erro ao carregar os dados. Verifique a URL e tente novamente.');
      }
      setLoading(false);
    }
    loadData();
  }, [courseId, scheduleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={40} />
      </div>
    );
  }

  if (error || !course || !schedule) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center text-center p-6">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/academy">
          <Button variant="outline">Voltar aos Cursos</Button>
        </Link>
      </div>
    );
  }

  const dateStr = new Date(schedule.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const formatPrice = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleWhatsAppRedirect = () => {
    const number = settings?.whatsapp_number?.replace(/\D/g, '') || '';
    if (!number) {
      alert('Número de WhatsApp não configurado no sistema. Entre em contato com o suporte.');
      return;
    }
    
    const message = `Olá, gostaria de adquirir o curso VIP *${course.title}*.\n\n*Detalhes do Agendamento:*\nData: ${dateStr}\nHorário: ${schedule.time || 'A definir'}\nLocal: ${schedule.location || 'A definir'}\nValor: ${formatPrice(course.price)}\n\nComo posso proceder com o pagamento e garantir minha vaga?`;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header Simplificado */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--color-card)]/50">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-foreground/70 hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold uppercase tracking-wider text-sm text-gold">Checkout VIP</span>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Coluna Esquerda - Resumo do Pedido */}
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-6">Resumo da Inscrição</h1>
            
            <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden mb-6">
              {course.thumbnail_url && (
                <div className="aspect-video relative">
                  <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
                </div>
              )}
              <div className="p-6">
                <div className="inline-block px-3 py-1 bg-gold/10 text-gold text-xs font-bold uppercase rounded-full mb-3">
                  Curso Presencial (VIP)
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">{course.title}</h2>
                <p className="text-sm text-foreground/60 mb-6 line-clamp-3">{course.description}</p>
                
                <div className="space-y-3 bg-[var(--background)] p-4 rounded-lg border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-3 text-sm text-foreground/80">
                    <Calendar size={16} className="text-gold" />
                    <span><strong>Data:</strong> {dateStr}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground/80">
                    <Clock size={16} className="text-gold" />
                    <span><strong>Horário:</strong> {schedule.time || 'A definir'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground/80">
                    <MapPin size={16} className="text-gold" />
                    <span><strong>Local:</strong> {schedule.location || 'A definir'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-foreground">O que está incluso:</h3>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex gap-2"><Check size={16} className="text-green-500 shrink-0" /> Formação presencial exclusiva</li>
                {course.certificate_included && (
                  <li className="flex gap-2"><Check size={16} className="text-green-500 shrink-0" /> Certificado de conclusão</li>
                )}
                <li className="flex gap-2"><Check size={16} className="text-green-500 shrink-0" /> Contato direto e suporte</li>
              </ul>
            </div>
          </div>

          {/* Coluna Direita - Finalizar via WhatsApp */}
          <div>
            <div className="bg-[var(--color-card)] border border-gold/30 rounded-xl p-8 sticky top-24">
              <h3 className="text-lg font-bold text-foreground mb-6">Investimento</h3>
              
              <div className="flex items-end gap-3 mb-6">
                <span className="text-4xl font-black text-gold">{formatPrice(course.price)}</span>
                {course.original_price > course.price && (
                  <span className="text-lg text-foreground/40 line-through mb-1">{formatPrice(course.original_price)}</span>
                )}
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-6 mb-6">
                
                {course.stripe_payment_link ? (
                  <>
                    <p className="text-sm text-foreground/80 mb-6">
                      Clique no botão abaixo para garantir sua vaga de forma segura via Asaas.
                    </p>
                    <a 
                      href={course.stripe_payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-14 text-base font-bold flex items-center justify-center gap-2 bg-gold hover:bg-gold-light text-black rounded-lg transition-transform hover:scale-105"
                    >
                      <CreditCard size={20} />
                      Ir para Pagamento
                    </a>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground/80 mb-6">
                      Para garantir sua vaga e excelência no atendimento, o processo de pagamento e reserva é finalizado de forma personalizada via WhatsApp diretamente com a equipe.
                    </p>
                    <Button 
                      onClick={handleWhatsAppRedirect}
                      className="w-full h-14 text-base font-bold flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white border-none shadow-lg shadow-[#25D366]/20 transition-transform hover:scale-105"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      Finalizar Reserva via WhatsApp
                    </Button>
                  </>
                )}

              </div>

              <p className="text-xs text-foreground/50 text-center">
                * Sua vaga só será reservada após a confirmação do pagamento.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
