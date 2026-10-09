import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Client Supabase server-side com sessão lida/gravada em cookies.
 * Usar em Server Components, Route Handlers e API routes.
 */
export async function getSupabaseServerClient() {
  // Modo demonstração (sem credenciais): retorna client no-op.
  if (!supabaseUrl || !supabaseAnonKey) {
    const resolvedValue = { data: null, error: null };
    const makeChain = (): any => {
      const obj: any = {
        then: (resolve: any, reject: any) => Promise.resolve(resolvedValue).then(resolve, reject),
        catch: (reject: any) => Promise.resolve(resolvedValue).catch(reject),
      };
      const chain = new Proxy(obj, { get(t, p) { return p in t ? t[p] : () => chain; } });
      return chain;
    };
    const noop = () => Promise.resolve(resolvedValue);
    return new Proxy(
      { auth: { getSession: noop, getUser: noop, signInWithPassword: noop, signOut: noop }, from: () => makeChain() },
      { get(t, p) { if (typeof p === 'string' && p.startsWith('_')) return undefined; return Reflect.get(t, p, t); } }
    ) as any;
  }
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado a partir de um Server Component — o proxy atualiza os cookies.
        }
      },
    },
  });
}

/**
 * Client com SERVICE ROLE KEY — ignora RLS.
 * Usar APENAS em rotas de servidor confiáveis (ex.: agendamento público,
 * onde o visitante não tem sessão mas a escrita é legítima).
 */
export async function getSupabaseServiceClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service role não configurado');
  }
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
