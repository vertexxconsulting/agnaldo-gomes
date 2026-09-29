import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: courses, error } = await supabase
      .from('academy_vip_courses')
      .select('*')
      .eq('is_published', true)
      .order('is_featured', { ascending: false });

    if (error) throw error;
    
    // Fetch all active schedules regardless of course
    const { data: allSchedules } = await supabase
      .from('academy_vip_schedules')
      .select('*')
      .eq('is_active', true)
      .order('date', { ascending: true });
      
    const activeSchedules = allSchedules?.filter((s: any) => new Date(s.date) > new Date()) || [];

    // Inject the same universal free dates into every course
    const filteredCourses = courses?.map((c: any) => ({
      ...c,
      schedules: activeSchedules
    })) || [];

    return NextResponse.json(filteredCourses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
