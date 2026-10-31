export const ROLES = {
  ADMIN: 'ADMIN',
  STUDIO_ADMIN: 'studio_admin',
  ACADEMY_ADMIN: 'academy_admin',
  LOJA_ADMIN: 'loja_admin',
  ALUNO: 'STUDENT',
  STUDIO_SECRETARIA: 'studio_secretaria',
  STUDIO_PROFISSIONAL: 'studio_profissional',
  CUSTOMER: 'CUSTOMER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES] | 'PROFESSIONAL';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador Geral',
  studio_admin: 'Gestor do Studio',
  academy_admin: 'Gestor da Academy',
  loja_admin: 'Gestor da Loja',
  STUDENT: 'Aluno',
  studio_secretaria: 'Secretária do Studio',
  studio_profissional: 'Profissional',
  PROFESSIONAL: 'Profissional',
  CUSTOMER: 'Cliente/Comprador',
};

export const AREA_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador Geral',
  studio_admin: 'Studio (painel do salão)',
  academy_admin: 'Academy (administração de cursos)',
  loja_admin: 'Loja (e-commerce)',
  STUDENT: 'Aluno (área de cursos)',
  studio_secretaria: 'Secretaria (Studio)',
  studio_profissional: 'Profissional (Studio)',
  PROFESSIONAL: 'Profissional (Studio)',
  CUSTOMER: 'Cliente/Comprador (Loja)',
};

/** Mapeia a role da aplicação para o enum 'user_role' do PostgreSQL (profiles.role) */
export function toDbRole(role: string): string {
  const r = (role || '').toLowerCase();
  if (r.includes('profis') || r.includes('professional')) return 'PROFESSIONAL';
  if (r === 'aluno' || r === 'student') return 'STUDENT';
  if (r === 'cliente' || r === 'customer') return 'CUSTOMER';
  if (r === 'admin') return 'ADMIN';
  if (r.includes('secretaria')) return 'studio_secretaria';
  if (r.includes('studio_admin')) return 'studio_admin';
  return role;
}

/** Mapeia o enum 'user_role' do PostgreSQL (profiles.role) de volta para a role padrão da aplicação */
export function fromDbRole(role: string): Role {
  const r = (role || '').toLowerCase();
  if (r === 'professional' || r === 'profissional') return ROLES.STUDIO_PROFISSIONAL;
  if (r === 'student' || r === 'aluno') return ROLES.ALUNO;
  if (r === 'customer' || r === 'cliente') return ROLES.CUSTOMER;
  return role as Role;
}

/** Rotas de área e o papel exigido para acessá-las */
export const AREA_ROLES: Record<string, Role> = {
  '/admin/meu-painel': ROLES.STUDIO_PROFISSIONAL,
  '/admin': ROLES.STUDIO_ADMIN,
  '/hub': ROLES.STUDIO_SECRETARIA,
  '/admin-academy': ROLES.ACADEMY_ADMIN,
  '/admin-loja': ROLES.LOJA_ADMIN,
  '/aluno': ROLES.ALUNO,
};

/** Login correspondente a cada área */
export const LOGIN_BY_AREA: Record<string, string> = {
  '/admin': '/login',
  '/admin-academy': '/admin-academy/login',
  '/admin-loja': '/admin-loja/login',
  '/aluno': '/academy/login',
};

export function getArea(pathname: string): string | null {
  for (const area of Object.keys(AREA_ROLES)) {
    if (pathname === area || pathname.startsWith(area + '/')) {
      return area;
    }
  }
  return null;
}

export function getUserRole(
  user: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null | undefined
): Role | null {
  const metaRole = (user?.user_metadata?.role || (user as any)?.app_metadata?.role);
  if (typeof metaRole !== 'string') return null;
  const lower = metaRole.toLowerCase();
  if (lower === 'admin') return ROLES.ADMIN;
  if (lower === 'studio_admin') return ROLES.STUDIO_ADMIN;
  if (lower === 'studio_secretaria') return ROLES.STUDIO_SECRETARIA;
  if (lower === 'studio_profissional') return ROLES.STUDIO_PROFISSIONAL;
  if (lower === 'academy_admin') return ROLES.ACADEMY_ADMIN;
  if (lower === 'loja_admin') return ROLES.LOJA_ADMIN;
  if (lower === 'student' || lower === 'aluno') return ROLES.ALUNO;
  if (lower === 'customer' || lower === 'cliente') return ROLES.CUSTOMER;
  return (Object.values(ROLES) as string[]).includes(metaRole as any) ? (metaRole as Role) : null;
}

/** Se o usuário é o dono do salão (vê todos os módulos no hub) */
export function isOwner(
  user: { user_metadata?: Record<string, unknown> } | null | undefined
): boolean {
  const meta = user?.user_metadata;
  if (!meta) return false;
  if (meta.isOwner === true || meta.is_owner === true) return true;
  const role = getUserRole(user);
  if (role === ROLES.ADMIN || role === ROLES.STUDIO_ADMIN) return true;
  return false;
}

/** Módulos que cada papel pode ver no Command Center (/hub) */
export type HubModule = 'studio' | 'academy' | 'loja';

export function getHubModules(
  user: { user_metadata?: Record<string, unknown> } | null | undefined
): HubModule[] {
  const role = getUserRole(user);
  if (role === ROLES.STUDIO_SECRETARIA || role === ROLES.STUDIO_PROFISSIONAL) return ['studio'];
  if (role === ROLES.ADMIN || role === ROLES.ACADEMY_ADMIN || role === ROLES.LOJA_ADMIN || role === ROLES.STUDIO_ADMIN) {
    return ['studio', 'academy', 'loja'];
  }
  if (role === ROLES.ALUNO) return ['academy'];
  return ['studio', 'academy', 'loja'];
}

export const HUB_MODULE_INFO: Record<HubModule, { label: string; href: string }> = {
  studio: { label: 'Studio (CRM/Agenda)', href: '/admin' },
  academy: { label: 'Academy', href: '/admin-academy' },
  loja: { label: 'Loja', href: '/admin-loja' },
};
