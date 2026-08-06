'use client';

import { SectionTitle } from '@/components/SectionTitle';
import { Button } from '@/components/Button';
import { MapPin, CheckCircle2, Phone, CalendarDays, User } from 'lucide-react';
import Link from 'next/link';

export default function ContatoPage() {
  return (
    <section className="w-full py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-auto lg:max-w-none lg:scale-[0.93] xl:scale-[0.95] 2xl:scale-100">
          <SectionTitle title="Agendamento Rápido" subtitle="Acesse nosso sistema online" align="center" />

          <div className="flex justify-center mt-12">
            <div className="w-full max-w-md">
              <div className="glass p-8 rounded-2xl border border-primary/30 relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <CalendarDays size={24} />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">Agendamento Online</h3>
                <p className="text-foreground/70 text-sm mb-8">
                  Quer marcar um horário ou verificar seus agendamentos? Acesse nosso sistema rápido e prático.
                </p>
                <div className="flex flex-col gap-4">
                  <Link href="/agendamento" className="w-full">
                    <Button variant="primary" className="w-full text-xs uppercase tracking-widest h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40">
                      Agendar Horário
                    </Button>
                  </Link>
                  <Link href="/perfil" className="w-full">
                    <Button variant="outline" className="w-full text-xs uppercase tracking-widest h-12 border-primary/50 text-foreground hover:bg-primary/10">
                      <User size={16} className="mr-2" />
                      Já tenho cadastro
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
