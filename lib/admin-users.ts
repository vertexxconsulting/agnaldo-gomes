import { createClient } from '@supabase/supabase-js';
import { Role, toDbRole, fromDbRole } from '@/lib/auth';
import { setUserNickname, normalizeNickname } from '@/lib/nicknames';

export async function getAllProfiles(excludeRole?: Role) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Forçamos a leitura de todos os perfis, ignorando qualquer RLS por ser Service Role
  let query = supabaseAdmin
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (excludeRole) {
    query = query.neq('role', excludeRole);
  }

  const { data: profiles, error } = await query;
  if (error) throw new Error(`Erro ao buscar perfis: ${error.message}`);

  // Enriquecer com metadados do Supabase Auth para garantir que alterações recentes
  // em full_name e nickname sejam imediatamente refletidas na gestão de equipe
  try {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const authUsers = authData?.users || [];
    const authUserMap = new Map(authUsers.map(u => [u.id, u]));

    const enriched = (profiles || []).map(p => {
      const u = authUserMap.get(p.id) || authUsers.find(user => user.email?.toLowerCase() === p.email?.toLowerCase());
      if (!u) return { ...p, role: fromDbRole(p.role, p.permissions) };

      const userMeta = u.user_metadata || {};
      const fullName = (userMeta.full_name && typeof userMeta.full_name === 'string' && userMeta.full_name.trim())
        ? userMeta.full_name.trim()
        : p.full_name;
      const nickname = (p.permissions as any)?.nickname || userMeta.nickname || '';
      const phone = userMeta.phone || p.phone || '';
      const avatarUrl = userMeta.avatar_url || p.avatar_url || null;

      const perms = {
        ...((p.permissions as any) || {}),
        ...(nickname ? { nickname } : {}),
      };

      // Sincroniza profiles no banco de dados se houver discrepância
      if (userMeta.full_name && p.full_name !== userMeta.full_name) {
        Promise.resolve(
          supabaseAdmin
            .from('profiles')
            .update({ full_name: userMeta.full_name, permissions: perms })
            .eq('id', p.id)
        ).catch((e: any) => console.warn('[getAllProfiles] Falha assíncrona ao sincronizar profile:', e));
      }

      return {
        ...p,
        role: fromDbRole(p.role, perms),
        full_name: fullName,
        phone,
        avatar_url: avatarUrl,
        nickname,
        permissions: perms,
      };
    });

    return enriched;
  } catch (authErr) {
    console.warn('[getAllProfiles] Falha ao enriquecer com Auth:', authErr);
    return (profiles || []).map(p => ({ ...p, role: fromDbRole(p.role, p.permissions) }));
  }
}

async function syncAuxiliarProfessionalRecord(
  supabaseAdmin: any,
  params: {
    userId: string;
    fullName?: string;
    email?: string;
    avatarUrl?: string;
    professionalId?: string;
  }
): Promise<string | undefined> {
  try {
    const { data: allProfs } = await supabaseAdmin
      .from('salon_professionals')
      .select('*');

    const normalize = (t?: string | null) =>
      (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const targetEmail = normalize(params.email);
    const targetName = normalize(params.fullName);

    const existing = (allProfs || []).find((sp: any) =>
      (params.professionalId && sp.id === params.professionalId) ||
      (sp.user_id && sp.user_id === params.userId) ||
      (targetEmail && sp.email && normalize(sp.email) === targetEmail) ||
      (targetName && normalize(sp.name) === targetName)
    );

    const schedMeta = {
      ...(existing?.weekly_schedule || {}),
      _meta: {
        ...((existing?.weekly_schedule as any)?._meta || {}),
        is_auxiliar: true,
        cargo: 'auxiliar',
        role_title: 'Auxiliar (Cabelo)',
      }
    };

    if (existing) {
      await supabaseAdmin
        .from('salon_professionals')
        .update({
          user_id: params.userId,
          name: params.fullName || existing.name,
          email: params.email || existing.email || null,
          photo_url: params.avatarUrl || existing.photo_url || null,
          categoria: existing.categoria || 'Cabelo',
          role_title: 'Auxiliar (Cabelo)',
          active: true,
          weekly_schedule: schedMeta,
        })
        .eq('id', existing.id);
      return existing.id;
    } else if (params.fullName) {
      const { data: inserted } = await supabaseAdmin
        .from('salon_professionals')
        .insert({
          name: params.fullName.trim(),
          user_id: params.userId,
          email: params.email || null,
          photo_url: params.avatarUrl || null,
          categoria: 'Cabelo',
          role_title: 'Auxiliar (Cabelo)',
          specialties: ['Auxiliar (Cabelo)'],
          active: true,
          weekly_schedule: schedMeta,
        })
        .select('id')
        .single();
      return inserted?.id;
    }
  } catch (err) {
    console.warn('[syncAuxiliarProfessionalRecord] Aviso ao sincronizar auxiliar em salon_professionals:', err);
  }
  return params.professionalId;
}

export async function updateUserRole(
  userId: string, 
  newRole: Role, 
  permissions?: any,
  extra?: { avatar_url?: string; professional_id?: string; full_name?: string; nickname?: string }
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Ler perfil atual para não perder permissões existentes quando apenas a role é alterada
  const { data: currentProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // 1. Atualizar a tabela 'profiles' (DB)
  const perms = { ...((currentProfile?.permissions as any) || {}), ...(permissions || {}) };
  const isAuxRole = newRole === 'studio_auxiliar' || newRole === 'AUXILIAR' || (permissions && permissions.is_auxiliar === true);

  if (isAuxRole) {
    perms.is_auxiliar = true;
    perms.cargo = 'auxiliar';
    perms.tipo = 'auxiliar';
    perms.categoria = 'Cabelo';
  } else if (newRole && newRole !== 'PROFESSIONAL' && permissions === undefined) {
    // Se mudou explicitamente de role na tabela para outra que não seja auxiliar
    delete perms.is_auxiliar;
    if (perms.cargo === 'auxiliar') delete perms.cargo;
    if (perms.tipo === 'auxiliar') delete perms.tipo;
  }

  if (extra?.professional_id) {
    perms.professional_id = extra.professional_id;
  }
  if (extra?.nickname) {
    perms.nickname = normalizeNickname(extra.nickname);
  }

  if (isAuxRole) {
    const syncedProfId = await syncAuxiliarProfessionalRecord(supabaseAdmin, {
      userId,
      fullName: extra?.full_name || currentProfile?.full_name,
      email: currentProfile?.email,
      avatarUrl: extra?.avatar_url || currentProfile?.avatar_url,
      professionalId: perms.professional_id,
    });
    if (syncedProfId) {
      perms.professional_id = syncedProfId;
    }
  }

  const updateData: any = { role: toDbRole(newRole), permissions: perms, updated_at: new Date().toISOString() };
  if (extra?.avatar_url) {
    updateData.avatar_url = extra.avatar_url;
  }
  if (extra?.full_name) {
    updateData.full_name = extra.full_name;
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (profileError) throw new Error(`Erro ao atualizar profile: ${profileError.message}`);

  // 2. Vincular com salon_professionals se houver professional_id ou atualizar nome
  if (extra?.professional_id || extra?.full_name) {
    try {
      const profUpdate: any = {};
      if (extra.professional_id) profUpdate.user_id = userId;
      if (extra.full_name) profUpdate.name = extra.full_name;
      if (extra.avatar_url) profUpdate.photo_url = extra.avatar_url;

      if (extra.professional_id) {
        await supabaseAdmin
          .from('salon_professionals')
          .update(profUpdate)
          .eq('id', extra.professional_id);
      } else {
        await supabaseAdmin
          .from('salon_professionals')
          .update(profUpdate)
          .eq('user_id', userId);
      }
    } catch (err) {
      console.warn('Aviso ao sincronizar salon_professionals:', err);
    }
  }

  // 3. Tentar atualizar os metadados do Auth
  try {
    const authMeta: any = { role: newRole, permissions: perms };
    if (extra?.avatar_url) authMeta.avatar_url = extra.avatar_url;
    if (extra?.professional_id) authMeta.professional_id = extra.professional_id;
    if (extra?.full_name) authMeta.full_name = extra.full_name;
    if (perms.nickname) authMeta.nickname = perms.nickname;

    await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: authMeta }
    );
  } catch (authError: any) {
    console.warn(`Aviso: Metadados do Auth não atualizados para ${userId}: ${authError.message}`);
  }

  // 4. Se houver nickname, sincronizar com o mapa global
  if (perms.nickname) {
    try {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      if (userProfile?.email) {
        await setUserNickname(userProfile.email, perms.nickname);
      }
    } catch (nickErr) {
      console.warn('Aviso ao sincronizar nickname global:', nickErr);
    }
  }

  return { success: true };
}

export async function createAdminUser(userData: { 
  email: string; 
  full_name: string; 
  password: string; 
  role: Role; 
  permissions?: any;
  avatar_url?: string;
  professional_id?: string;
}) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const perms = { ...(userData.permissions || {}) };
  if (userData.professional_id) {
    perms.professional_id = userData.professional_id;
  }

  // 1. Verifica se o usuário já existe
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', userData.email)
    .maybeSingle();

  if (existingProfile && existingProfile.id) {
    if (userData.password) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
          password: userData.password,
        });
      } catch (passErr) {
        console.warn('Aviso ao atualizar senha de usuário existente:', passErr);
      }
    }
    // Atualiza a role e permissões do usuário existente
    await updateUserRole(existingProfile.id, userData.role, perms, {
      avatar_url: userData.avatar_url,
      professional_id: userData.professional_id,
      full_name: userData.full_name,
    });
    return { success: true, user: { id: existingProfile.id } };
  }

  // Verifica se já existe conta no Auth (por exemplo criada antes mas com profile pendente)
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = authData?.users?.find(u => u.email?.toLowerCase() === userData.email.toLowerCase());
  if (existingAuthUser) {
    if (userData.password) {
      await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        password: userData.password,
      });
    }
    await updateUserRole(existingAuthUser.id, userData.role, perms, {
      avatar_url: userData.avatar_url,
      professional_id: userData.professional_id,
      full_name: userData.full_name,
    });
    return { success: true, user: { id: existingAuthUser.id } };
  }

  // 2. Criar o usuário no Supabase Auth
  const authMeta: any = { 
    role: userData.role, 
    full_name: userData.full_name, 
    permissions: perms 
  };
  if (userData.avatar_url) authMeta.avatar_url = userData.avatar_url;
  if (userData.professional_id) authMeta.professional_id = userData.professional_id;

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true, // Confirma o e-mail automaticamente para acesso imediato
    user_metadata: authMeta
  });

  if (authError) throw new Error(`Erro ao criar conta no Auth: ${authError.message}`);

  // 3. Se for Auxiliar (Cabelo), sincronizar imediatamente em salon_professionals antes de salvar o profile
  const isAuxRole = userData.role === 'studio_auxiliar' || userData.role === 'AUXILIAR' || perms.is_auxiliar === true;
  if (isAuxRole) {
    perms.is_auxiliar = true;
    perms.cargo = 'auxiliar';
    perms.tipo = 'auxiliar';
    perms.categoria = 'Cabelo';
    const syncedProfId = await syncAuxiliarProfessionalRecord(supabaseAdmin, {
      userId: authUser.user.id,
      fullName: userData.full_name,
      email: userData.email,
      avatarUrl: userData.avatar_url,
      professionalId: userData.professional_id,
    });
    if (syncedProfId) {
      perms.professional_id = syncedProfId;
      userData.professional_id = syncedProfId;
    }
  }

  // 4. Criar ou atualizar o perfil na tabela profiles
  const profilePayload: any = {
    id: authUser.user.id,
    email: userData.email,
    full_name: userData.full_name,
    role: toDbRole(userData.role),
    permissions: perms,
  };
  if (userData.avatar_url) {
    profilePayload.avatar_url = userData.avatar_url;
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(profilePayload);

  if (profileError) throw new Error(`Erro ao criar perfil no banco: ${profileError.message}`);

  // 5. Vincular na tabela salon_professionals caso seja um profissional
  if (userData.professional_id && !isAuxRole) {
    try {
      await supabaseAdmin
        .from('salon_professionals')
        .update({ user_id: authUser.user.id })
        .eq('id', userData.professional_id);
    } catch (profErr) {
      console.warn('Aviso ao vincular usuário ao profissional:', profErr);
    }
  }

  // 5. Se houver nickname, sincronizar com o mapa global
  if (perms.nickname) {
    try {
      await setUserNickname(userData.email, perms.nickname);
    } catch (nickErr) {
      console.warn('Aviso ao sincronizar nickname global:', nickErr);
    }
  }

  return { success: true, user: authUser.user };
}

export async function deleteUser(userId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Exclui o usuário do Auth. Se houver CASCADE no banco de dados, o profile também será deletado.
  // Caso não haja, deletamos o profile explicitamente primeiro.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId);
    
  if (profileError) {
    console.warn(`Aviso: erro ao deletar profile para ${userId}: ${profileError.message}`);
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) throw new Error(`Erro ao excluir conta do Auth: ${authError.message}`);

  return { success: true };
}
