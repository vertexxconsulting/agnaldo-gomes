import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const auth = await requireAcademyAuth();
    if (auth.error) return auth.error;

    const { data, error } = await supabaseAdmin
      .from('academy_vip_courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching VIP courses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAcademyAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('academy_vip_courses')
      .insert({
        title: body.title,
        description: body.description || '',
        price: body.price || 0,
        original_price: body.original_price || 0,
        is_published: body.is_published || false,
        thumbnail_url: body.thumbnail_url || null,
        is_featured: body.is_featured || false,
        format_text: body.format_text || '',
        certificate_included: body.certificate_included ?? true,
        content_topics: body.content_topics || [],
        investment_options: body.investment_options || [],
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating VIP course:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
