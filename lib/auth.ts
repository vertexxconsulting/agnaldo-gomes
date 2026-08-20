export const ROLES = {
  STUDIO_ADMIN: 'studio_admin',
  ACADEMY_ADMIN: 'academy_admin',
  LOJA_ADMIN: 'loja_admin',
  ALUNO: 'aluno',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const AREA_LABELS: Record<Role, string> = {
  studio_admin: 'Studio (painel do salão)',
  academy_admin: 'Academy (administração de cursos)',
  loja_admin: 'Loja (e-commerce)',
  aluno: 'Aluno (área de cursos)',
};

/** Rotas de área e o papel exigido para acessá-las */
export const AREA_ROLES: Record<string, Role> = {
  '/admin': ROLES.STUDIO_ADMIN,
  '/hub': ROLES.STUDIO_ADMIN,
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
  const role = user?.user_metadata?.role;
  if (typeof role !== 'string') return null;
  return (Object.values(ROLES) as string[]).includes(role) ? (role as Role) : null;
}
