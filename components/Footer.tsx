'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';



/* Ícone SVG Instagram (glyph oficial via simple-icons) — lucide-react@1.28 não inclui */
const InstagramIcon = ({ className = 'size-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 1.646-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
  </svg>
);

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-background text-foreground pt-20 pb-10">
      <div className="container mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-5 mt-2">
            <div className="bg-[#111111] py-3 px-6 rounded-2xl shadow-lg border border-white/5">
              <Image
                src="/logo branca.png"
                alt="Agnaldo Gomes"
                width={300}
                height={78}
                className="object-contain drop-shadow-md"
                priority
              />
            </div>
          </Link>
          <p className="text-sm leading-relaxed max-w-xs">
            Elevando o padrão da beleza através de um studio premium e uma academia focada em formar os melhores profissionais do mercado.
          </p>
          <div className="flex flex-col gap-2 mt-3">
            {/* Perfil pessoal */}
            <a href="https://instagram.com/agnaldogomes_hairstyle" target="_blank" rel="noopener noreferrer" aria-label="Instagram de Agnaldo Gomes" className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-primary transition-colors">
              <span className="text-primary"><InstagramIcon /></span>
              <span>Agnaldo Gomes</span>
            </a>
            {/* Perfil do Studio */}
            <a href="https://instagram.com/studiodebeleza.agnaldogomes" target="_blank" rel="noopener noreferrer" aria-label="Instagram do Studio Hair Style" className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-primary transition-colors">
              <span className="text-primary"><InstagramIcon /></span>
              <span>Studio Hair Style</span>
            </a>
            {/* Perfil da Academy */}
            <a href="https://instagram.com/agnaldogomesacademy" target="_blank" rel="noopener noreferrer" aria-label="Instagram da Academy" className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-primary transition-colors">
              <span className="text-primary"><InstagramIcon /></span>
              <span>Agnaldo Gomes Academy</span>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold mb-6 uppercase tracking-widest text-sm">Navegação</h4>
          <ul className="flex flex-col gap-3 text-sm">
            <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li><Link href="/sobre" className="hover:text-primary transition-colors">Sobre Nós</Link></li>
            <li><Link href="/academy" className="hover:text-primary transition-colors">Academy</Link></li>
            <li><Link href="/studio" className="hover:text-primary transition-colors">Studio de Beleza</Link></li>
            <li><Link href="/aluno" className="hover:text-primary transition-colors">Área do Aluno</Link></li>
          </ul>
        </div>

        {/* Services */}
        <div>
          <h4 className="font-semibold mb-6 uppercase tracking-widest text-sm">Serviços</h4>
          <ul className="flex flex-col gap-3 text-sm">
            <li><Link href="/studio" className="hover:text-primary transition-colors">Cortes Premium</Link></li>
            <li><Link href="/studio" className="hover:text-primary transition-colors">Coloração e Mechas</Link></li>
            <li><Link href="/studio" className="hover:text-primary transition-colors">Tratamentos Capilares</Link></li>
            <li><Link href="/academy" className="hover:text-primary transition-colors">Cursos Presenciais</Link></li>
            <li><Link href="/academy" className="hover:text-primary transition-colors">Workshops</Link></li>
          </ul>
        </div>

        {/* Localização */}
        <div className="space-y-3">
          <h4 className="font-semibold uppercase tracking-widest text-sm">Localização</h4>
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-primary shrink-0 mt-0.5" />
              <span>Rua Professora Otília Macedo Sikorski, 16 — Telêmaco Borba/PR</span>
            </li>
          </ul>
          {/* Mapa embed */}
          <div className="mt-3 rounded-xl overflow-hidden border border-[var(--border-subtle)] shadow-[0_4px_14px_rgb(0,0,0,0.05)] ring-1 ring-primary/10 bg-background">
            <iframe
              title="Mapa do Studio Agnaldo Gomes"
              className="w-full h-40 sm:h-44"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3524.677350769434!2d-49.3560823!3d-24.3310391!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ea0a7c0d4f1d3b%3A0x6f8d0e9f0b0b0b0b!2sRua%20Professora%20Ot%C3%ADlia%20Macedo%20Sikorski%2C%2016%20%E2%80%94%20Tel%C3%AAmaco%20Borba%2FPR!5e0!3m2!1spt-BR!2sbr!4v1700000000000"
              allowFullScreen
            />
          </div>
        </div>

      </div>

      <div className="container mx-auto px-6 md:px-12 border-t border-[var(--border-subtle)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-foreground/60">
        <p>&copy; {new Date().getFullYear()} Agnaldo Gomes. Todos os direitos reservados.</p>
        <div className="flex gap-6">
          <Link href="/politica-de-privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link>
          <Link href="/termos-de-uso" className="hover:text-primary transition-colors">Termos de Uso</Link>
        </div>
      </div>
    </footer>
  );
}
