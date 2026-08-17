'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Client Supabase para o navegador com sessão armazenada em COOKIES
 * (permite que o proxy.ts valide a sessão e o papel do usuário).
 * Não importar em código server-side — use '@/lib/supabase/server'.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
