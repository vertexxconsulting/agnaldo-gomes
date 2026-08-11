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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-amber-200">
      
      {/* Topbar / Aviso - Escuro elegante no lugar do verde */}
      <div className="bg-[#1A1A1A] text-white text-[11px] md:text-xs uppercase tracking-widest text-center py-2 font-medium flex items-center justify-center gap-4">
        <span>FRETE GRÁTIS NAS COMPRAS ACIMA DE R$ 299,00</span>
        <Link href="/loja" className="border border-white/40 px-3 py-0.5 hover:bg-white hover:text-black transition-colors text-[10px]">Saiba Mais</Link>
      </div>

      {/* Header E-commerce - Tom Bege/Areia */}
      <header className="bg-[#F4F1EA] border-b border-[#E5E0D8] sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-6">
          
          {/* Esquerda: Menu Hamburguer (Mobile) */}
          <div className="flex items-center lg:hidden">
            <button className="text-slate-800" onClick={() => setIsMenuOpen(true)}>
              <Menu size={24} />
            </button>
          </div>

          {/* Logo (Esquerda) */}
          <Link href="/loja" className="flex-shrink-0 flex items-center justify-center lg:justify-start">
             <Image 
               src="/opt/logo-branca.webp" 
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
                className="w-full bg-white border border-[#E5E0D8] rounded-sm py-3 pl-4 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors shadow-sm"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-amber-600 transition-colors">
                <Search size={20} />
              </button>
            </div>
          </div>

          {/* Direita: Conta, Atendimento & Carrinho */}
          <div className="flex items-center justify-end gap-6 text-slate-700">
            <Link href="/contato" className="hidden xl:flex items-center gap-2 hover:text-amber-600 transition-colors text-xs font-medium">
              <User size={20} />
              <span>Atendimento</span>
            </Link>
            
            <Link href="/perfil" className="hidden xl:flex items-center gap-2 hover:text-amber-600 transition-colors text-xs font-medium">
              <User size={20} />
              <span>Minha Conta</span>
            </Link>
            
            <Link href="/loja/carrinho" className="relative hover:text-amber-600 transition-colors flex items-center gap-2 border-l border-[#E5E0D8] pl-6 ml-2">
              <ShoppingBag size={24} />
              {/* Badge do Carrinho */}
              {mounted && itemCount >= 0 && (
                <span className="absolute -top-1 -right-2 bg-[#1A1A1A] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
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
              className="w-full bg-white border border-[#E5E0D8] rounded-sm py-2 pl-4 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
              <Search size={18} />
            </button>
          </div>
        </div>

        {/* Categorias Desktop - Estilo Salles (Fundo Bege) */}
        <nav className="hidden lg:flex items-center justify-between h-14 bg-[#F4F1EA] border-t border-[#E5E0D8] text-[12px] font-medium text-slate-700 container mx-auto px-4 md:px-6">
          <div className="flex items-center gap-8">
            <Link href="/loja" className="hover:text-amber-600 transition-colors flex items-center gap-1">Kits Promocionais <span className="text-[9px] opacity-50">▼</span></Link>
            <Link href="/loja" className="hover:text-amber-600 transition-colors flex items-center gap-1">Tratamento <span className="text-[9px] opacity-50">▼</span></Link>
            <Link href="/loja" className="hover:text-amber-600 transition-colors flex items-center gap-1">Finalizadores <span className="text-[9px] opacity-50">▼</span></Link>
            <Link href="/loja" className="hover:text-amber-600 transition-colors flex items-center gap-1">Barbearia <span className="text-[9px] opacity-50">▼</span></Link>
            <Link href="/loja" className="hover:text-amber-600 transition-colors flex items-center gap-1">Acessórios <span className="text-[9px] opacity-50">▼</span></Link>
          </div>
          
          {/* Botão Destaque Substituindo o Verde da Salles */}
          <Link href="/loja" className="bg-[#1A1A1A] text-white px-6 py-2.5 rounded-sm flex items-center gap-2 hover:bg-slate-800 transition-colors font-bold text-xs uppercase tracking-wider">
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
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              className="relative w-4/5 max-w-sm bg-white border-r border-slate-200 h-full flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <span className="font-medium text-sm uppercase tracking-widest text-slate-900">Menu</span>
                <button onClick={() => setIsMenuOpen(false)} className="text-slate-500"><X size={20}/></button>
              </div>
              <div className="p-4 flex flex-col gap-4 text-slate-700 text-sm font-medium tracking-wide">
                <Link href="/loja" onClick={() => setIsMenuOpen(false)}>Mais Vendidos</Link>
                <Link href="/loja" onClick={() => setIsMenuOpen(false)}>Kits Promocionais</Link>
                <Link href="/loja" onClick={() => setIsMenuOpen(false)}>Tratamento</Link>
                <Link href="/loja" onClick={() => setIsMenuOpen(false)}>Finalizadores</Link>
                <Link href="/loja" onClick={() => setIsMenuOpen(false)} className="text-amber-600 font-bold">Recomendações</Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50">
        {children}
      </main>

      {/* Footer Elegante */}
      <footer className="bg-[#F4F1EA] text-slate-600 py-6 mt-8 border-t border-[#E5E0D8]">
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
            <h3 className="text-slate-900 font-bold text-xs uppercase tracking-widest mb-4">Atendimento</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>Segunda a Sábado, 09h às 18h</li>
              <li>WhatsApp: (42) 99999-9999</li>
              <li>contato@agnaldogomes.com.br</li>
            </ul>
          </div>
          <div>
            <h3 className="text-slate-900 font-bold text-xs uppercase tracking-widest mb-4">Políticas</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link href="/politicas" className="hover:text-amber-600 transition-colors">Trocas e Devoluções</Link></li>
              <li><Link href="/politicas" className="hover:text-amber-600 transition-colors">Prazos e Entregas</Link></li>
              <li><Link href="/politicas" className="hover:text-amber-600 transition-colors">Termos de Uso</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 mt-6 pt-4 border-t border-[#E5E0D8] text-[10px] text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <p>© {new Date().getFullYear()} Agnaldo Gomes Store. Todos os direitos reservados.</p>
            <p>Desenvolvido por <span className="font-semibold text-slate-600">Vertex Consulting</span></p>
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
