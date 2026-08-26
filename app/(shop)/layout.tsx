'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Search, Menu, X, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.getItemCount());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col selection:bg-primary/20">
      
      {/* Topbar / Aviso */}
      <div className="bg-foreground text-background text-[11px] md:text-xs uppercase tracking-widest text-center py-2 font-medium flex items-center justify-center gap-4">
        <span>FRETE GRÁTIS NAS COMPRAS ACIMA DE R$ 299,00</span>
        <Link href="/loja" className="border border-background/40 px-3 py-0.5 hover:bg-background hover:text-foreground transition-colors text-[10px]">Saiba Mais</Link>
      </div>

      {/* Header E-commerce */}
      <header className="bg-secondary/50 border-b border-[var(--border-subtle)] sticky top-0 z-50 shadow-sm backdrop-blur-sm">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-6">
          
          {/* Esquerda: Menu Hamburguer (Mobile) */}
          <div className="flex items-center lg:hidden">
            <button className="text-foreground" onClick={() => setIsMenuOpen(true)} aria-label="Abrir menu">
              <Menu size={24} />
            </button>
          </div>

          {/* Logo (Esquerda) */}
          <Link href="/loja" className="flex-shrink-0 flex items-center justify-center lg:justify-start">
             <Image 
               src="/opt/logo-hero.webp" 
               alt="Agnaldo Gomes Logo" 
               width={100} 
               height={100} 
               className="object-contain" 
             />
          </Link>

          {/* Centro: Barra de Busca Expandida */}
          <div className="hidden lg:flex flex-1 max-w-2xl ml-8">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="O que deseja procurar?" 
                className="w-full bg-card border border-[var(--border-subtle)] rounded-lg py-3 pl-4 pr-12 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors shadow-sm"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-primary transition-colors" aria-label="Buscar">
                <Search size={20} />
              </button>
            </div>
          </div>

          {/* Direita: Conta, Atendimento & Carrinho */}
          <div className="flex items-center justify-end gap-6 text-foreground/80">
            <a href="https://wa.link/t02ox1" target="_blank" rel="noopener noreferrer" className="hidden xl:flex items-center gap-2 hover:text-primary transition-colors text-xs font-medium">
              <User size={20} />
              <span>Atendimento</span>
            </a>
            
            <Link href="/perfil" className="hidden xl:flex items-center gap-2 hover:text-primary transition-colors text-xs font-medium">
              <User size={20} />
              <span>Minha Conta</span>
            </Link>
            
            <Link href="/loja/carrinho" className="relative hover:text-primary transition-colors flex items-center gap-2 border-l border-[var(--border-subtle)] pl-6 ml-2" aria-label="Carrinho">
              <ShoppingBag size={24} />
              {/* Badge do Carrinho */}
              {mounted && itemCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-primary text-primary-foreground text-[10px] font-bold min-w-[20px] h-5 px-0.5 rounded-full flex items-center justify-center shadow-md">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Barra de Busca Mobile */}
        <div className="lg:hidden px-4 pb-4">
          <div className="relative w-full">
            <input 
              type="text" 
              placeholder="O que deseja procurar?" 
              className="w-full bg-card border border-[var(--border-subtle)] rounded-lg py-2 pl-4 pr-10 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50" aria-label="Buscar">
              <Search size={18} />
            </button>
          </div>
        </div>

        {/* Categorias Desktop */}
        <nav className="hidden lg:flex items-center justify-between h-14 bg-secondary/50 border-t border-[var(--border-subtle)] text-[12px] font-medium text-foreground/70 container mx-auto px-4 md:px-6">
          <div className="flex items-center gap-8">
            <Link href="/loja/categoria/kits-promocionais" className="hover:text-primary transition-colors flex items-center gap-1">Kits Promocionais <span className="text-[9px] opacity-50">▼</span></Link>
            <Link href="/loja/categoria/tratamento" className="hover:text-primary transition-colors flex items-center gap-1">Tratamento <span className="text-[9px] opacity-50">▼</span></Link>
            <Link href="/loja/categoria/finalizadores" className="hover:text-primary transition-colors flex items-center gap-1">Finalizadores <span className="text-[9px] opacity-50">▼</span></Link>
            <Link href="/loja/categoria/barbearia" className="hover:text-primary transition-colors flex items-center gap-1">Barbearia <span className="text-[9px] opacity-50">▼</span></Link>
            <Link href="/loja/categoria/acessorios" className="hover:text-primary transition-colors flex items-center gap-1">Acessórios <span className="text-[9px] opacity-50">▼</span></Link>
          </div>
          
          {/* Botão Destaque */}
          <Link href="/loja/categoria/recomendacoes" className="bg-foreground text-background px-6 py-2.5 rounded-lg flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors font-bold text-xs uppercase tracking-wider">
            Recomendações <span className="text-[9px] opacity-50">▼</span>
          </Link>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[60] flex">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              className="relative w-4/5 max-w-sm bg-card border-r border-[var(--border-subtle)] h-full flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center">
                <span className="font-medium text-sm uppercase tracking-widest text-foreground">Menu</span>
                <button onClick={() => setIsMenuOpen(false)} className="text-foreground/50" aria-label="Fechar menu"><X size={20}/></button>
              </div>
              <div className="p-4 flex flex-col gap-4 text-foreground/80 text-sm font-medium tracking-wide">
                <Link href="/loja/categoria/mais-vendidos" onClick={() => setIsMenuOpen(false)}>Mais Vendidos</Link>
                <Link href="/loja/categoria/kits-promocionais" onClick={() => setIsMenuOpen(false)}>Kits Promocionais</Link>
                <Link href="/loja/categoria/tratamento" onClick={() => setIsMenuOpen(false)}>Tratamento</Link>
                <Link href="/loja/categoria/finalizadores" onClick={() => setIsMenuOpen(false)}>Finalizadores</Link>
                <Link href="/loja/categoria/recomendacoes" onClick={() => setIsMenuOpen(false)} className="text-primary font-bold">Recomendações</Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 bg-background">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-secondary/40 text-foreground/60 py-6 mt-8 border-t border-[var(--border-subtle)]">
        <div className="container mx-auto px-4 md:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-1 sm:col-span-2">
             <div className="flex items-center gap-3 mb-3">
                <Image 
                  src="/logo.png" 
                  alt="Agnaldo Gomes Logo" 
                  width={140} 
                  height={50} 
                  className="object-contain h-10 w-auto"
                />
             </div>
            <p className="text-xs leading-relaxed max-w-sm">A curadoria perfeita para profissionais da beleza. Produtos testados e aprovados pela experiência de Agnaldo Gomes.</p>
          </div>
          <div>
            <h3 className="text-foreground font-bold text-xs uppercase tracking-widest mb-4">Atendimento</h3>
            <ul className="space-y-2 text-xs text-foreground/60">
              <li>Segunda a Sábado, 09h às 18h</li>
              <li>WhatsApp: (42) 99999-9999</li>
              <li>contato@agnaldogomes.com.br</li>
            </ul>
          </div>
          <div>
            <h3 className="text-foreground font-bold text-xs uppercase tracking-widest mb-4">Políticas</h3>
            <ul className="space-y-2 text-xs text-foreground/60">
                <li><Link href="/politica-de-privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link></li>
                <li><Link href="/termos-de-uso" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
                <li><Link href="/proposta" className="hover:text-primary transition-colors">Sobre os Preços</Link></li>
              </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 mt-6 pt-4 border-t border-[var(--border-subtle)] text-[10px] text-foreground/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <p>© {new Date().getFullYear()} Agnaldo Gomes Store. Todos os direitos reservados.</p>
            <p>Desenvolvido por <span className="font-semibold text-foreground/60">Vertex Consulting</span></p>
          </div>
          <div className="flex gap-3 opacity-60">
            <Image src="/pagamentos/pix.svg" alt="Pix" width={24} height={24} className="h-4 w-auto grayscale" />
            <Image src="/pagamentos/mercadopago.svg" alt="Mercado Pago" width={24} height={24} className="h-4 w-auto grayscale" />
            <Image src="/pagamentos/visa.svg" alt="Visa" width={24} height={24} className="h-4 w-auto grayscale" />
            <Image src="/pagamentos/mastercard.svg" alt="Mastercard" width={24} height={24} className="h-4 w-auto grayscale" />
          </div>
        </div>
      </footer>
    </div>
  );
}
