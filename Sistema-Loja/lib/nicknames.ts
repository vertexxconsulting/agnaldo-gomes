import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Normaliza um nickname para formato padronizado (minúsculas, sem acentos, sem espaços)
 * Ex: "Agnaldo Gomes" -> "agnaldogomes"
 * Ex: "Érica" -> "erica"
 */
export function normalizeNickname(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '');
}

/**
 * Resolve qualquer identificador (e-mail ou nickname) para o e-mail real da conta.
 */
export async function resolveIdentifierToEmail(identifier: string): Promise<{
  email: string | null;
  full_name?: string;
  source?: string;
}> {
  if (!identifier) return { email: null };

  const trimmed = identifier.trim();

  // 1. Se já for um e-mail com '@', retorna diretamente
  if (trimmed.includes('@')) {
    return { email: trimmed.toLowerCase(), source: 'direct_email' };
  }

  const clean = normalizeNickname(trimmed);
  if (!clean) return { email: null };

  const supabase = getSupabaseAdmin();

  // 2. Busca no mapa explícito de nicknames em salon_system_settings
  try {
    const { data: settingData } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', 'user_nicknames')
      .maybeSingle();

    if (settingData?.value) {
      const map: Record<string, string> = JSON.parse(settingData.value);
      // Checa case-insensitive
      for (const [nick, email] of Object.entries(map)) {
        if (normalizeNickname(nick) === clean) {
          return { email: email.toLowerCase(), source: 'system_settings' };
        }
      }
    }
  } catch (err) {
    console.warn('[resolveIdentifierToEmail] Falha ao consultar salon_system_settings:', err);
  }

  // 3. Busca na tabela profiles por permissions.nickname, nome completo ou prefixo do e-mail
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, permissions');

    if (profiles && profiles.length > 0) {
      // 3.1 Checa se algum profile tem nickname explícito em permissions
      for (const p of profiles) {
        if (!p.email) continue;
        const pNick = (p.permissions as any)?.nickname;
        if (pNick && normalizeNickname(pNick) === clean) {
          return { email: p.email.toLowerCase(), full_name: p.full_name || undefined, source: 'profile_permissions' };
        }
      }

      // 3.2 Checa se bate com o primeiro nome do usuário
      for (const p of profiles) {
        if (!p.email || !p.full_name) continue;
        const primeiroNome = normalizeNickname(p.full_name.split(' ')[0]);
        if (primeiroNome && primeiroNome === clean) {
          return { email: p.email.toLowerCase(), full_name: p.full_name, source: 'first_name_match' };
        }
      }

      // 3.3 Checa se bate com o nome completo sem espaços
      for (const p of profiles) {
        if (!p.email || !p.full_name) continue;
        const nomeCompleto = normalizeNickname(p.full_name.replace(/\s+/g, ''));
        if (nomeCompleto && nomeCompleto === clean) {
          return { email: p.email.toLowerCase(), full_name: p.full_name, source: 'full_name_match' };
        }
      }

      // 3.4 Checa se bate com o prefixo do e-mail (antes do @)
      for (const p of profiles) {
        if (!p.email) continue;
        const prefixoEmail = normalizeNickname(p.email.split('@')[0]);
        if (prefixoEmail && prefixoEmail === clean) {
          return { email: p.email.toLowerCase(), full_name: p.full_name || undefined, source: 'email_prefix_match' };
        }
      }
    }
  } catch (err) {
    console.warn('[resolveIdentifierToEmail] Falha ao consultar profiles:', err);
  }

  // 4. Busca nos metadados do Auth (user_metadata.nickname ou user_metadata.username)
  try {
    const { data: authData } = await supabase.auth.admin.listUsers();
    if (authData?.users) {
      for (const u of authData.users) {
        if (!u.email) continue;
        const metaNick = u.user_metadata?.nickname || u.user_metadata?.username;
        if (metaNick && normalizeNickname(metaNick) === clean) {
          return { 
            email: u.email.toLowerCase(), 
            full_name: u.user_metadata?.full_name || undefined, 
            source: 'auth_metadata' 
          };
        }
      }
    }
  } catch (err) {
    console.warn('[resolveIdentifierToEmail] Falha ao consultar auth.users:', err);
  }

  // 5. Busca em salon_professionals (caso seja membro da equipe do salão com e-mail cadastrado)
  try {
    const { data: pros } = await supabase
      .from('salon_professionals')
      .select('name, email, phone');

    if (pros && pros.length > 0) {
      for (const pro of pros) {
        if (!pro.email) continue;
        const proPrimeiro = normalizeNickname((pro.name || '').split(' ')[0]);
        const proCompleto = normalizeNickname((pro.name || '').replace(/\s+/g, ''));
        if (proPrimeiro === clean || proCompleto === clean) {
          return { email: pro.email.toLowerCase(), full_name: pro.name, source: 'salon_professional_match' };
        }
      }
    }
  } catch (err) {
    console.warn('[resolveIdentifierToEmail] Falha ao consultar salon_professionals:', err);
  }

  return { email: null };
}

/**
 * Cadastra ou atualiza o nickname de um usuário no sistema.
 */
export async function setUserNickname(
  email: string, 
  nickname: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanNick = normalizeNickname(nickname);

  if (!cleanNick || cleanNick.length < 2) {
    return { success: false, error: 'O nickname deve conter pelo menos 2 caracteres alfanuméricos.' };
  }

  const supabase = getSupabaseAdmin();

  // 1. Carrega o mapa atual de nicknames
  let map: Record<string, string> = {};
  try {
    const { data: settingData } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', 'user_nicknames')
      .maybeSingle();

    if (settingData?.value) {
      map = JSON.parse(settingData.value);
    }
  } catch (e) {
    console.warn('[setUserNickname] Falha ao carregar mapa existente:', e);
  }

  // 2. Verifica se o nickname já está em uso por outro e-mail
  for (const [existingNick, existingEmail] of Object.entries(map)) {
    if (normalizeNickname(existingNick) === cleanNick && existingEmail.toLowerCase() !== cleanEmail) {
      return { success: false, error: `O nickname "${cleanNick}" já está em uso por outro usuário.` };
    }
  }

  // 3. Atualiza o mapa e salva em salon_system_settings
  map[cleanNick] = cleanEmail;
  const { error: saveError } = await supabase
    .from('salon_system_settings')
    .upsert({
      key: 'user_nicknames',
      value: JSON.stringify(map),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (saveError) {
    return { success: false, error: `Erro ao salvar nas configurações: ${saveError.message}` };
  }

  // 4. Atualiza também os metadados do usuário no Auth se possível
  try {
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = authData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
    if (user) {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          nickname: cleanNick
        }
      });
    }
  } catch (err) {
    console.warn('[setUserNickname] Aviso ao atualizar user_metadata no Auth:', err);
  }

  // 5. Atualiza o campo permissions.nickname na tabela profiles
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, permissions')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profile) {
      const perms = (profile.permissions as any) || {};
      perms.nickname = cleanNick;
      await supabase
        .from('profiles')
        .update({ permissions: perms, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
    }
  } catch (err) {
    console.warn('[setUserNickname] Aviso ao atualizar permissions no profile:', err);
  }

  return { success: true };
}

/**
 * Retorna todos os nicknames cadastrados no sistema.
 */
export async function getAllNicknames(): Promise<Record<string, string>> {
  const supabase = getSupabaseAdmin();
  try {
    const { data: settingData } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', 'user_nicknames')
      .maybeSingle();

    if (settingData?.value) {
      return JSON.parse(settingData.value);
    }
  } catch (err) {
    console.warn('[getAllNicknames] Erro ao buscar nicknames:', err);
  }
  return {};
}
