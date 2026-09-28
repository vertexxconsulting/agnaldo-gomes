import { NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';
import { deleteUser } from '@/lib/admin-users';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    // Delete the user from Supabase Auth and Profiles table
    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir aluno:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir aluno' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const { action } = await req.json(); // 'block' | 'unblock'
    
    // 1. Atualizar o profile com is_blocked usando supabaseAdmin para ignorar RLS
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ is_blocked: action === 'block' })
      .eq('id', id)
      .select();

    if (profileError) throw profileError;
    if (!data || data.length === 0) {
      throw new Error('Usuário não encontrado ou não atualizado.');
    }

    // Opcional: Se 'block', podemos também desativar a conta no Supabase Auth para bloquear login real
    if (action === 'block') {
      await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '87600h' });
    } else {
      await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: 'none' });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao alterar bloqueio:', error);
    return NextResponse.json({ error: error.message || 'Erro ao alterar bloqueio' }, { status: 500 });
  }
}
