import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { requireAlunoAuth } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireAlunoAuth();
  if (auth.error) return auth.error;

  const { supabase, user } = auth;
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('course_certificates')
      .select(`
        *,
        courses!course_id (title, thumbnail_url)
      `)
      .eq('user_id', user.id)
      .eq('status', 'issued')
      .order('issued_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ certificados: data ?? [] });
  } catch (error) {
    console.error('[aluno/certificados] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar certificados' }, { status: 500 });
  }
}