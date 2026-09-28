'use client';

import Link from 'next/link';

/**
 * Página de manutenção — exibida quando o sistema está em modo de manutenção.
 * Pode ser ativada com: import { setMaintenance } from '@/lib/maintenance';
 * 
 * ESTADO: arquivo separado com conteúdo "export const maintenanceMode = false;"
 *
 * Para ativar:
 * 1. No lib/maintenance.ts: alterar para `export const maintenanceMode = true;`
 * 2. Re-build ou deploy
 *
 * Para desativar:
 * 1. No lib/maintenance.ts: alterar para `export const maintenanceMode = false;`
 * 2. Re-build ou deploy
 */

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
      {/* Background decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#B8860B]/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#B8860B]/5 blur-3xl" />
      </div>

      <div className="relative text-center max-w-lg">
        <div className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-[#B8860B]/20 rounded-3xl p-10 shadow-2xl">
          {/* Ícone de manutenção */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#B8860B]/10 mb-8">
            <svg className="w-10 h-10 text-[#B8860B]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.182a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
            </svg>
          </div>

          {/* Título */}
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#0A0A0A]">
            Sistema em Manutenção
          </h1>

          {/* Subtítulo */}
          <p className="text-[#0A0A0A]/60 mt-3 text-base max-w-sm mx-auto leading-relaxed">
            Estamos realizando atualizações para garantir o melhor funcionamento do sistema.
            Interrupções temporárias podem ocorrer durante este período.
          </p>

          {/* Mensagem de status */}
          <div className="mt-6 p-4 rounded-xl bg-[#B8860B]/5 border border-[#B8860B]/10 max-w-xs mx-auto">
            <div className="flex items-center gap-2 text-sm text-[#B8860B]/80">
              <span className="w-2 h-2 rounded-full bg-[#B8860B] animate-pulse" />
              <span className="font-medium">Manutenção ativa — voltaremos em breve</span>
            </div>
          </div>

          {/* Link de retorno */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#B8860B] text-[#0A0A0A] font-semibold hover:bg-[#B8860B]/90 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar ao início
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#0A0A0A]/40 mt-6">
          © 2026 Gestão AG — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
