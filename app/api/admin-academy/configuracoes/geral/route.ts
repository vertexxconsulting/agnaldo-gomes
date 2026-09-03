import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/api-auth';

// Buscar a configuração atual
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('academy_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar academy_settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || { id: 1, welcome_video_url: '' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Salvar/Atualizar a configuração
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    if (!session || (session.role !== 'academy_admin' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { welcome_video_url } = body;

    // Verificar se já existe (id = 1)
    const { data: existing } = await supabase
      .from('academy_settings')
      .select('id')
      .eq('id', 1)
      .single();

    let result;
    if (existing) {
      // Update
      result = await supabase
        .from('academy_settings')
        .update({
          welcome_video_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select()
        .single();
    } else {
      // Insert
      result = await supabase
        .from('academy_settings')
        .insert({
          id: 1,
          welcome_video_url,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Erro ao salvar academy_settings:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
