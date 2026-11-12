// Edge Function: cron-dispatcher
// Disparador de automações de marketing/lembretes para Studio Agnaldo Gomes
// Roda agendado (ex: pg_cron a cada 15 ou 30 minutos) chamando a aplicação Next.js
// ou processando diretamente.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const APP_URL = Deno.env.get("APP_URL") || "https://agnaldogomes.com";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    
    // Alvo: Endpoint dispatcher da aplicação Next.js
    const targetUrl = `${APP_URL}/api/cron/dispatcher?execute=true${force ? "&force=true" : ""}`;
    console.log(`[cron-dispatcher] Acionando dispatcher em: ${targetUrl}`);

    const headers: Record<string, string> = {
      "User-Agent": "Supabase-Edge-Function-Cron/1.0",
    };
    if (CRON_SECRET) {
      headers["Authorization"] = `Bearer ${CRON_SECRET}`;
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
    });

    const data = await response.json().catch(() => null);

    return new Response(
      JSON.stringify({
        ok: response.ok,
        status: response.status,
        data,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: response.status,
      }
    );
  } catch (error) {
    console.error("[cron-dispatcher] Erro na execução:", error);
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
