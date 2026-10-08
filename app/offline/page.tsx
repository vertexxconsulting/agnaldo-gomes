import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sem conexão | Studio Agnaldo Gomes',
  description: 'Você está offline. Verifique sua conexão com a internet.',
  robots: 'noindex',
};

export default function OfflinePage() {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#D4AF37" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *{box-sizing:border-box;margin:0;padding:0}
              body{
                min-height:100dvh;
                display:flex;align-items:center;justify-content:center;
                background:#faf8f3;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                padding:1.5rem;
              }
              .card{
                max-width:420px;width:100%;
                background:#fff;
                border-radius:24px;
                box-shadow:0 8px 40px rgba(0,0,0,.10);
                border:1px solid rgba(212,175,55,.25);
                padding:2.5rem 2rem;
                text-align:center;
              }
              .icon{font-size:3.5rem;margin-bottom:1.25rem;display:block}
              h1{font-size:1.5rem;font-weight:700;color:#1d1b18;margin-bottom:.5rem}
              p{color:#6b7280;font-size:.95rem;line-height:1.6;margin-bottom:1.75rem}
              .btn{
                display:inline-flex;align-items:center;justify-content:center;gap:.5rem;
                padding:.85rem 1.75rem;border-radius:14px;font-weight:600;font-size:.95rem;
                text-decoration:none;cursor:pointer;border:none;
                background:#D4AF37;color:#fff;
                transition:background .2s,transform .1s;
                margin-bottom:.75rem;width:100%;
              }
              .btn:hover{background:#b5952f;transform:translateY(-1px)}
              .btn-secondary{background:#f3f4f6;color:#374151}
              .btn-secondary:hover{background:#e5e7eb}
              .tips{
                margin-top:1.75rem;
                background:#faf8f3;border-radius:14px;
                padding:1.25rem;text-align:left;
              }
              .tips h3{font-size:.8rem;font-weight:700;color:#a8862a;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem}
              .tips li{font-size:.85rem;color:#6b7280;margin-bottom:.4rem;list-style:none;padding-left:1.25rem;position:relative}
              .tips li::before{content:"•";position:absolute;left:0;color:#D4AF37}
            `,
          }}
        />
      </head>
      <body>
        <div className="card">
          <span className="icon">📡</span>
          <h1>Você está offline</h1>
          <p>
            Parece que você perdeu a conexão com a internet. Algumas páginas que você visitou anteriormente
            podem ainda estar disponíveis.
          </p>

          <button
            id="retry-btn"
            className="btn"
            style={{ cursor: 'pointer' }}
          >
            🔄 Tentar novamente
          </button>

          <a href="/" className="btn btn-secondary">
            🏠 Ir para o início
          </a>

          <div className="tips">
            <h3>Páginas disponíveis offline</h3>
            <ul>
              <li>Página inicial</li>
              <li>Agendamento (visualização)</li>
              <li>Informações sobre o Studio</li>
            </ul>
          </div>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Auto-recarregar quando a conexão voltar
              window.addEventListener('online', function() {
                window.location.href = sessionStorage.getItem('lastPage') || '/';
              });
              // Salvar a última página visitada
              if (document.referrer) {
                sessionStorage.setItem('lastPage', document.referrer);
              }
              // Botão de recarregar
              var retryBtn = document.getElementById('retry-btn');
              if (retryBtn) {
                retryBtn.addEventListener('click', function() {
                  window.location.reload();
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
