import { NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  try {
    const { data, error } = await auth.supabase!
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/admin-academy/cursos] Erro ao buscar cursos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { title, description, thumbnail_url, duration_hours, level, tags } = body;

    if (!title) {
      return NextResponse.json({ error: 'Título do curso é obrigatório.' }, { status: 400 });
    }

    // Simple slug generator
    const slug = String(title)
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w-]+/g, '') + '-' + Date.now().toString().slice(-4);

    const payload = {
      title: String(title).trim(),
      slug: slug,
      description: description || '',
      thumbnail_url: thumbnail_url || '',
      status: 'DRAFT',
    };

    const { data, error } = await auth.supabase!
      .from('courses')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin-academy/cursos] Erro ao criar curso:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, curso: data });
  } catch (err) {
    console.error('[api/admin-academy/cursos] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}