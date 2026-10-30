import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { setUserNickname, normalizeNickname } from '@/lib/nicknames';

export async function GET() {
  const supabaseServer = await getSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const supabase = await getSupabaseServiceClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        phone: profile?.phone || user.user_metadata?.phone || '',
        nickname: (profile?.permissions as any)?.nickname || user.user_metadata?.nickname || '',
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        role: profile?.role || user.user_metadata?.role || 'CUSTOMER',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabaseServer = await getSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { full_name, phone, nickname, avatar_url } = body;

    const supabase = await getSupabaseServiceClient();

    // 1. Obter perfil atual
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const perms = (currentProfile?.permissions as any) || {};
    let cleanNick = '';
    if (nickname && typeof nickname === 'string' && nickname.trim()) {
      cleanNick = normalizeNickname(nickname.trim());
      perms.nickname = cleanNick;
    }

    // 2. Atualizar tabela profiles (DB) com privilégios de Service Role
    const profilePatch: Record<string, any> = {
      updated_at: new Date().toISOString(),
      permissions: perms,
    };
    if (full_name !== undefined) profilePatch.full_name = full_name;
    if (phone !== undefined) profilePatch.phone = phone;
    if (avatar_url !== undefined) profilePatch.avatar_url = avatar_url;

    if (currentProfile) {
      const { error: errUpdate } = await supabase
        .from('profiles')
        .update(profilePatch)
        .eq('id', user.id);
      if (errUpdate) throw errUpdate;
    } else {
      const { error: errInsert } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          ...profilePatch,
        });
      if (errInsert) throw errInsert;
    }

    // 3. Atualizar metadados no Supabase Auth
    try {
      const authMeta = {
        ...user.user_metadata,
        ...(full_name !== undefined && { full_name }),
        ...(phone !== undefined && { phone }),
        ...(cleanNick && { nickname: cleanNick }),
        ...(avatar_url !== undefined && { avatar_url }),
      };

      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: authMeta,
      });
    } catch (authErr) {
      console.warn('[api/admin/perfil] Aviso ao atualizar user_metadata no Auth:', authErr);
    }

    // 4. Se houver nickname, sincronizar com o mapa global em salon_system_settings
    if (cleanNick && user.email) {
      await setUserNickname(user.email, cleanNick);
    }

    // 5. Se o usuário for um profissional vinculado no salão, atualizar o nome e telefone dele também
    try {
      const professionalId = perms.professional_id || user.user_metadata?.professional_id;
      if (professionalId) {
        const profPatch: Record<string, any> = {};
        if (full_name) profPatch.nome = full_name;
        if (phone) profPatch.telefone = phone;
        if (avatar_url) profPatch.foto = avatar_url;
        await supabase
          .from('salon_professionals')
          .update(profPatch)
          .eq('id', professionalId);
      } else if (user.email) {
        const { data: prof } = await supabase
          .from('salon_professionals')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (prof?.id) {
          const profPatch: Record<string, any> = {};
          if (full_name) profPatch.nome = full_name;
          if (phone) profPatch.telefone = phone;
          if (avatar_url) profPatch.foto = avatar_url;
          await supabase
            .from('salon_professionals')
            .update(profPatch)
            .eq('id', prof.id);
        }
      }
    } catch (profErr) {
      console.warn('[api/admin/perfil] Aviso ao sincronizar salon_professionals:', profErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: full_name ?? currentProfile?.full_name,
        nickname: cleanNick || perms.nickname,
        phone: phone ?? currentProfile?.phone,
        avatar_url: avatar_url ?? currentProfile?.avatar_url,
      }
    });
  } catch (err: any) {
    console.error('[api/admin/perfil POST]', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
