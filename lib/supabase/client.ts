'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Client supabase "dummy" quando as variáveis de ambiente não estão
 * configuradas (ex.: demonstração sem Supabase). As operações de rede
 * falham de forma silenciosa e os módulos caem para dados mock.
 * Suporta o chain: supabase.from('tabela').select('*').order('x')
 */
function createDummyClient(): any {
  const resolvedValue = { data: null, error: null };

  function makeChain(): any {
    const obj: any = {
      then: (resolve: any, reject: any) => Promise.resolve(resolvedValue).then(resolve, reject),
      catch: (reject: any) => Promise.resolve(resolvedValue).catch(reject),
      finally: (cb: any) => Promise.resolve(resolvedValue).finally(cb),
    };
    const chain = new Proxy(obj, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return () => chain;
      },
    });
    return chain;
  }

  return new Proxy(
    {
      auth: {
        getSession: () => Promise.resolve(resolvedValue),
        getUser: () => Promise.resolve(resolvedValue),
        signInWithPassword: () => Promise.resolve(resolvedValue),
        signOut: () => Promise.resolve(resolvedValue),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: (_table: string) => makeChain(),
    },
    {
      get(target, prop) {
        if (typeof prop === 'string' && prop.startsWith('_')) return undefined;
        return Reflect.get(target, prop, target);
      },
    }
  );
}

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createDummyClient();
