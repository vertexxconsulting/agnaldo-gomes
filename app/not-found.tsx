import Link from 'next/link';

/**
 * Pagina de erro 404 customizada — exibida quando a rota solicitada nao existe.
 * High-Contrast Minimalist: White (#FFFFFF) + Rich Gold (#B8860B)
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background decorativo — blur dourado */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gold/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gold/5 blur-3xl" />
      </div>

      <div className="relative text-center max-w-lg">
        <div className="bg-card-bg/90 backdrop-blur-xl border border-gold/20 rounded-3xl p-10 shadow-2xl">
          {/* Status code visual */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gold/10 mb-6">
            <span className="text-5xl font-serif font-bold text-gold tracking-tighter">404</span>
          </div>

          {/* Titulo */}
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
            Pagina nao encontrada
          </h1>

          {/* Subtitulo */}
          <p className="text-foreground/60 mt-3 text-base max-w-sm mx-auto leading-relaxed">
            A pagina que voce esta procurando nao existe ou pode ter sido removida.
            Verifique o endereco digitado ou volte para a pagina inicial.
          </p>

          {/* Navegacao de opcoes */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-foreground font-semibold hover:bg-gold-dim transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4-4a1 1 0 01-1-1v-4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4z" />
              </svg>
              Ir para o inicio
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gold/30 text-gold font-semibold hover:bg-gold/5 transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Area de Login
            </Link>
          </div>
        </div>

        {/* Mensagem adicional para admins */}
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-xs text-foreground/40 hover:text-foreground/60 transition-colors mb-2">
            Informacoes tecnicas (para administradores)
          </summary>
          <pre className="text-left text-xs text-foreground/40 bg-foreground/5 rounded-xl p-4 border border-gold/10 overflow-x-auto">
{`(status) => {
  // Este componente é renderizado pelo Next.js quando
  // nenhuma página corresponde ao path requisitado.
  // O código HTTP 404 é automaticamente enviado pelo framework.
  // Se necessário, personalizar o comportamento no middleware.ts
  // ou em Server Components com generateMetadata.
}`}
          </pre>
        </details>

        {/* Footer */}
        <p className="text-center text-xs text-foreground/40 mt-6">
          © 2026 Gestão AG — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
