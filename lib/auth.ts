export const ROLES = {
  ADMIN: 'ADMIN',
  STUDIO_ADMIN: 'studio_admin',
  ACADEMY_ADMIN: 'academy_admin',
  LOJA_ADMIN: 'loja_admin',
  ALUNO: 'STUDENT',
  STUDIO_SECRETARIA: 'studio_secretaria',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador Geral',
  studio_admin: 'Gestor do Studio',
  academy_admin: 'Gestor da Academy',
  loja_admin: 'Gestor da Loja',
  STUDENT: 'Aluno',
  studio_secretaria: 'Secretária do Studio',
};

export const AREA_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador Geral',
  studio_admin: 'Studio (painel do salão)',
  academy_admin: 'Academy (administração de cursos)',
  loja_admin: 'Loja (e-commerce)',
  STUDENT: 'Aluno (área de cursos)',
  studio_secretaria: 'Secretaria (Studio)',
};

/** Rotas de área e o papel exigido para acessá-las */
export const AREA_ROLES: Record<string, Role> = {
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
  user: { user_metadata?: Record<string, unknown> } | null | undefined
): Role | null {
  const metaRole = user?.user_metadata?.role;
  if (typeof metaRole !== 'string') return null;
  const roleStr = metaRole === 'admin' ? 'ADMIN' : metaRole;
  return (Object.values(ROLES) as string[]).includes(roleStr) ? (roleStr as Role) : null;
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
  if (role === ROLES.STUDIO_SECRETARIA) return ['studio'];
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
