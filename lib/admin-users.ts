import { createClient } from '@supabase/supabase-js';
import { Role } from '@/lib/auth';

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

  const { data, error } = await query;

  if (error) throw new Error(`Erro ao buscar perfis: ${error.message}`);
  return data;
}

export async function updateUserRole(
  userId: string, 
  newRole: Role, 
  permissions?: any,
  extra?: { avatar_url?: string; professional_id?: string }
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

  const updateData: any = { role: newRole, permissions: perms };
  if (extra?.avatar_url) {
    updateData.avatar_url = extra.avatar_url;
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (profileError) throw new Error(`Erro ao atualizar profile: ${profileError.message}`);

  // 2. Vincular com salon_professionals se houver professional_id
  if (extra?.professional_id) {
    try {
      await supabaseAdmin
        .from('salon_professionals')
        .update({ user_id: userId })
        .eq('id', extra.professional_id);
    } catch (err) {
      console.warn('Aviso ao vincular salon_professionals:', err);
    }
  }

  // 3. Tentar atualizar os metadados do Auth
  try {
    const authMeta: any = { role: newRole, permissions: perms };
    if (extra?.avatar_url) authMeta.avatar_url = extra.avatar_url;
    if (extra?.professional_id) authMeta.professional_id = extra.professional_id;

    await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: authMeta }
    );
  } catch (authError: any) {
    console.warn(`Aviso: Metadados do Auth não atualizados para ${userId}: ${authError.message}`);
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
    .single();

  if (existingProfile && existingProfile.id) {
    // Atualiza a role e permissões do usuário existente
    await updateUserRole(existingProfile.id, userData.role, perms, {
      avatar_url: userData.avatar_url,
      professional_id: userData.professional_id,
    });
    return { success: true, user: { id: existingProfile.id } };
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
    role: userData.role,
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
