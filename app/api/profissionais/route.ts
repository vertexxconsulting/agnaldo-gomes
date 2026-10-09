import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function checkEditPermission(auth: any): Promise<boolean> {
  const role = auth.user!.role;
  // Admins têm acesso total
  if (role === 'STUDIO_ADMIN' || role === 'ADMIN') return true;
  
  // Secretaria: verifica as permissões específicas granulares no JSONB "permissions"
  if (role === 'STUDIO_SECRETARIA') {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('permissions')
      .eq('id', auth.user!.id)
      .single();
      
    if (profile?.permissions?.profissionais === 'Edição') {
      return true;
    }
  }
  
  return false;
}

export async function GET() {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { data, error } = await auth.supabase!
      .from('salon_professionals')
      .select('*')
      .order('name');

    if (error) {
      console.error('[api/profissionais] Erro ao buscar profissionais:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  const canEdit = await checkEditPermission(auth);
  if (!canEdit) {
    return NextResponse.json({ error: 'Permissão negada. O admin não liberou acesso de Edição para profissionais na sua conta.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, nome, foto_url, categoria, especialidades, ativo, jornada_semanal } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Nome do profissional é obrigatório.' }, { status: 400 });
    }

    const payload: Record<string, any> = {
      name: String(nome).trim(),
      photo_url: foto_url || null,
      categoria: categoria || null,
      specialties: Array.isArray(especialidades) ? especialidades : [],
      active: ativo ?? true,
      weekly_schedule: jornada_semanal || {},
    };

    const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
      // Usando supabaseAdmin pois a role de Secretaria não tem update no RLS
      const { data, error } = await supabaseAdmin
        .from('salon_professionals')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('[api/profissionais] Erro ao atualizar profissional:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, profissional: data });
    } else {
      // Usando supabaseAdmin pois a role de Secretaria não tem insert no RLS
      const { data, error } = await supabaseAdmin
        .from('salon_professionals')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        console.error('[api/profissionais] Erro ao criar profissional:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, profissional: data });
    }
  } catch (err) {
    console.error('[api/profissionais] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  const canEdit = await checkEditPermission(auth);
  if (!canEdit) {
    return NextResponse.json({ error: 'Permissão negada. Você não tem acesso de edição/exclusão para profissionais.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do profissional é obrigatório.' }, { status: 400 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) {
      return NextResponse.json({ success: true, message: 'Mock id ignorado' });
    }

    // 1. Remove vínculos (usando supabaseAdmin)
    await supabaseAdmin.from('salon_professional_services').delete().eq('professional_id', id);

    // 2. Remove o profissional (usando supabaseAdmin)
    const { error } = await supabaseAdmin
      .from('salon_professionals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/profissionais] Erro ao excluir profissional:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/profissionais] Erro inesperado ao excluir profissional:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}