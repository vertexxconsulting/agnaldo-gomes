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

export async function updateUserRole(userId: string, newRole: Role, permissions?: any) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Atualizar a tabela 'profiles' (DB)
  const updateData: any = { role: newRole };
  if (permissions) {
    updateData.permissions = permissions;
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (profileError) throw new Error(`Erro ao atualizar profile: ${profileError.message}`);

  // 2. Tentar atualizar os metadados do Auth (opcional, evita erro se o usuário não existir no Auth)
  try {
    await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { role: newRole, ...(permissions && { permissions }) } }
    );
  } catch (authError: any) {
    console.warn(`Aviso: Metadados do Auth não atualizados para ${userId}: ${authError.message}`);
    // Não travamos a operação se o erro for apenas no Auth, pois o perfil no DB já foi atualizado
  }

  return { success: true };
}

export async function createAdminUser(userData: { email: string; full_name: string; password: string; role: Role; permissions?: any }) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Criar o usuário no Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true, // Confirma o e-mail automaticamente para acesso imediato
    user_metadata: { role: userData.role, full_name: userData.full_name, ...(userData.permissions && { permissions: userData.permissions }) }
  });

  if (authError) throw new Error(`Erro ao criar conta no Auth: ${authError.message}`);

  // 2. Criar o perfil na tabela profiles (caso o trigger handle_new_user falhe ou demore)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: authUser.user.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      ...(userData.permissions && { permissions: userData.permissions })
    });

  if (profileError) throw new Error(`Erro ao criar perfil no banco: ${profileError.message}`);

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
