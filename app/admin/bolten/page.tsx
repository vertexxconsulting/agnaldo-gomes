'use client';

import { motion } from 'framer-motion';
import { ShieldAlert, MessageCircle, ArrowLeft } from 'lucide-react';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import Link from 'next/link';

export default function BoltenCRMBlockedPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        <CardGlass className="p-8 text-center border-red-500/20 bg-red-500/5">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <ShieldAlert size={40} />
          </div>
          
          <h1 className="text-2xl font-serif font-bold mb-4 text-foreground">
            Módulo Bloqueado
          </h1>
          
          <p className="text-foreground/60 mb-8 leading-relaxed">
            O acesso ao sistema externo **Bolten CRM** foi restringido nesta instância. 
            Para ativar esta funcionalidade ou solicitar suporte técnico, entre em contato diretamente com a equipe de desenvolvimento.
          </p>
          
          <div className="space-y-3">
            <Link href="https://wa.me/5544999999999" target="_blank" className="block w-full">
              <Button variant="primary" className="w-full flex items-center justify-center gap-2">
                <MessageCircle size={18} />
                Vertex Consulting
              </Button>
            </Link>
            
            <Link href="/admin" className="block w-full">
              <Button variant="ghost" className="w-full flex items-center justify-center gap-2 text-foreground/50">
                <ArrowLeft size={16} />
                Voltar ao Dashboard
              </Button>
            </Link>
          </div>
          
          <p className="mt-8 text-[10px] uppercase tracking-widest text-foreground/30 font-bold">
            Security ID: VTX-BLOCKED-CRM
          </p>
        </CardGlass>
      </motion.div>
    </div>
  );
}
