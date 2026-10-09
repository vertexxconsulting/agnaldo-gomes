import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getUserRole, ROLES, type Role } from '@/lib/auth';
import { NextResponse } from 'next/server';

export interface AuthResult {
  error: NextResponse | null;
  user: { id: string; role: Role; email?: string } | null;
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>> | null;
}

export async function requireAuth(
  allowedRoles: Role | Role[]
): Promise<AuthResult> {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      user: null,
      supabase: null,
    };
  }

  const role = getUserRole(user);
  if (!role || (!roles.includes(role) && role !== 'ADMIN')) {
    return {
      error: NextResponse.json({ error: 'Acesso negado: permissão insuficiente' }, { status: 403 }),
      user: null,
      supabase: null,
    };
  }

  return {
    error: null,
    user: { id: user.id, role, email: user.email ?? undefined },
    supabase,
  };
}

export async function requireAdminAuth(): Promise<AuthResult> {
  return requireAuth(['studio_admin', 'academy_admin', 'loja_admin']);
}

export async function requireStudioAuth(): Promise<AuthResult> {
  return requireAuth(['studio_admin', 'studio_secretaria']);
}

export async function requireAcademyAuth(): Promise<AuthResult> {
  return requireAuth(['academy_admin']);
}

export async function requireLojaAuth(): Promise<AuthResult> {
  return requireAuth(['loja_admin']);
}

export async function requireAlunoAuth(): Promise<AuthResult> {
  return requireAuth([ROLES.ALUNO, 'academy_admin', 'studio_admin']);
}

/**
 * Verifica se o aluno está matriculado no curso.
 * Administradores e equipe do salão/academy têm acesso irrestrito.
 */
export async function requireEnrollment(cursoId: string): Promise<AuthResult> {
  const baseAuth = await requireAlunoAuth();
  if (baseAuth.error) return baseAuth;

  const { supabase, user } = baseAuth;
  if (!supabase || !user) {
    return {
      error: NextResponse.json({ error: 'Erro interno de autenticação' }, { status: 500 }),
      user: null,
      supabase: null,
    };
  }

  // Administradores, gestores do Academy e Studio têm acesso irrestrito a todos os cursos
  if (user.role === 'ADMIN' || user.role === 'academy_admin' || user.role === 'studio_admin') {
    return baseAuth;
  }

  const { data: enrollment, error } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', cursoId)
    .maybeSingle();

  if (error) {
    console.error('[requireEnrollment] Erro ao verificar matrícula:', error);
    return {
      error: NextResponse.json({ error: 'Erro ao verificar acesso ao curso' }, { status: 500 }),
      user: null,
      supabase: null,
    };
  }

  if (!enrollment) {
    return {
      error: NextResponse.json(
        { error: 'Você não tem acesso a este curso. Faça a matrícula primeiro.' },
        { status: 403 }
      ),
      user: null,
      supabase: null,
    };
  }

  return baseAuth;
}

export function handleAuthError(result: AuthResult): NextResponse | null {
  return result.error;
}