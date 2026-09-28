import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { supabase } = auth;
  if (!supabase) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'issued';
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('course_certificates')
      .select(`
        *,
        profiles!user_id (full_name, email),
        courses!course_id (title)
      `, { count: 'exact' })
      .eq('status', status)
      .order('issued_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      certificados: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error) {
    console.error('[admin-academy/certificados] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar certificados' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { supabase } = auth;
  if (!supabase) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { user_id, course_id, action } = body;

    if (!user_id || !course_id || !action) {
      return NextResponse.json({ error: 'user_id, course_id e action são obrigatórios' }, { status: 400 });
    }

    if (action === 'reissue') {
      // Revogar certificado existente
      await supabase
        .from('course_certificates')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('course_id', course_id)
        .eq('status', 'issued');

      // Emitir novo
      const { data: novoCert, error } = await supabase.rpc('check_and_issue_certificate', {
        p_user_id: user_id,
        p_course_id: course_id,
      });

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        certificado: novoCert?.[0],
        message: 'Certificado reemitido com sucesso' 
      });
    }

    if (action === 'revoke') {
      await supabase
        .from('course_certificates')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('course_id', course_id)
        .eq('status', 'issued');

      return NextResponse.json({ success: true, message: 'Certificado revogado' });
    }

    return NextResponse.json({ error: 'Action inválida' }, { status: 400 });
  } catch (error) {
    console.error('[admin-academy/certificados] Erro:', error);
    return NextResponse.json({ error: 'Erro ao processar certificado' }, { status: 500 });
  }
}