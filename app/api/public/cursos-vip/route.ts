import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: courses, error } = await supabase
      .from('academy_vip_courses')
      .select(`
        *,
        schedules:academy_vip_schedules(*)
      `)
      .eq('is_published', true)
      .order('is_featured', { ascending: false });

    if (error) throw error;
    
    // Filter out inactive schedules
    const filteredCourses = courses?.map((c: any) => ({
      ...c,
      schedules: c.schedules.filter((s: any) => s.is_active && new Date(s.date) > new Date())
    })) || [];

    return NextResponse.json(filteredCourses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
