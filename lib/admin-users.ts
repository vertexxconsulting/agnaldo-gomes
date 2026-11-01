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

  // 1. Atualizar a tabela 'profiles' (DB)
  const perms = { ...(permissions || {}) };
  if (extra?.professional_id) {
    perms.professional_id = extra.professional_id;
  }
  if (extra?.nickname) {
    perms.nickname = normalizeNickname(extra.nickname);
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

  // 3. Criar ou atualizar o perfil na tabela profiles
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

  // 4. Vincular na tabela salon_professionals caso seja um profissional
  if (userData.professional_id) {
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
