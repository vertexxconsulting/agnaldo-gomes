import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const auth = await requireAcademyAuth();
    if (auth.error) return auth.error;

    const { data, error } = await supabaseAdmin
      .from('academy_vip_schedules')
      .select(`
        *,
        course:academy_vip_courses(id, title)
      `)
      .order('date', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching VIP schedules:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAcademyAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    
    // Validate required fields
    if (!body.course_id || !body.date) {
      return NextResponse.json({ error: 'Course ID and Date are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('academy_vip_schedules')
      .insert({
        course_id: body.course_id,
        date: body.date,
        time: body.time || null,
        location: body.location || '',
        available_spots: body.available_spots || 1,
        is_active: body.is_active ?? true
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating VIP schedule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
