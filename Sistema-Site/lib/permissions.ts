export type PermissionLevel = 'none' | 'read' | 'write';

export const STUDIO_MODULES = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'comissoes', label: 'Comissões' },
  { id: 'equipe', label: 'Gestão de Equipe' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'fidelidade', label: 'Fidelidade' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'notas-fiscais', label: 'Notas Fiscais' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'profissionais', label: 'Profissionais' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'servicos', label: 'Serviços' },
] as const;

export const LOJA_MODULES = [
  { id: 'loja_produtos', label: 'Produtos' },
  { id: 'loja_pedidos', label: 'Pedidos' },
  { id: 'loja_configuracoes', label: 'Configurações' },
] as const;

export const ACADEMY_MODULES = [
  { id: 'academy_cursos', label: 'Gestão de Cursos' },
  { id: 'academy_cursos_vip', label: 'Cursos VIP' },
  { id: 'academy_agenda_vip', label: 'Agenda VIP' },
  { id: 'academy_alunos', label: 'Alunos' },
  { id: 'academy_comunidade', label: 'Comunidade' },
  { id: 'academy_certificados', label: 'Certificados' },
  { id: 'academy_configuracoes', label: 'Configurações' },
  { id: 'academy_vimeo', label: 'Vídeos' },
] as const;

export const ADMIN_MODULES = [...STUDIO_MODULES, ...LOJA_MODULES, ...ACADEMY_MODULES];

export type StudioModuleId = typeof STUDIO_MODULES[number]['id'];
export type LojaModuleId = typeof LOJA_MODULES[number]['id'];
export type AcademyModuleId = typeof ACADEMY_MODULES[number]['id'];

export type AdminModuleId = StudioModuleId | LojaModuleId | AcademyModuleId;

export type UserPermissions = Partial<Record<AdminModuleId, PermissionLevel>>;

// Default permissions for backward compatibility or new users without specific rules
export const DEFAULT_PERMISSIONS: UserPermissions = {
  agenda: 'write',
  clientes: 'write',
  comissoes: 'read',
  equipe: 'none',
  estoque: 'write',
  fidelidade: 'read',
  marketing: 'read',
  'notas-fiscais': 'read',
  pagamentos: 'write',
  profissionais: 'read',
  relatorios: 'read',
  servicos: 'read',
  loja_produtos: 'write',
  loja_pedidos: 'write',
  loja_configuracoes: 'none',
  academy_cursos: 'write',
  academy_cursos_vip: 'write',
  academy_agenda_vip: 'write',
  academy_alunos: 'write',
  academy_comunidade: 'write',
  academy_certificados: 'write',
  academy_configuracoes: 'none',
  academy_vimeo: 'write',
};

/** Verifica se o usuário tem permissão para acessar o módulo (read ou write) */
export function canAccess(permissions: UserPermissions | undefined, moduleId: AdminModuleId, fallbackRole?: string): boolean {
  if (fallbackRole === 'ADMIN' || fallbackRole === 'studio_admin') {
    // Para STUDIO_ADMIN, liberar só os do Studio? Por enquanto vamos manter o admin gerenciar tudo
    if (fallbackRole === 'studio_admin' && (moduleId.startsWith('loja_') || moduleId.startsWith('academy_'))) return false;
    if (fallbackRole === 'ADMIN') return true;
  }
  if (!permissions) return DEFAULT_PERMISSIONS[moduleId] !== 'none';
  return permissions[moduleId] === 'read' || permissions[moduleId] === 'write';
}

/** Verifica se o usuário tem permissão para editar no módulo */
export function canEdit(permissions: UserPermissions | undefined, moduleId: AdminModuleId, fallbackRole?: string): boolean {
  if (fallbackRole === 'ADMIN' || fallbackRole === 'studio_admin') {
    if (fallbackRole === 'studio_admin' && (moduleId.startsWith('loja_') || moduleId.startsWith('academy_'))) return false;
    if (fallbackRole === 'ADMIN') return true;
  }
  if (!permissions) return DEFAULT_PERMISSIONS[moduleId] === 'write';
  return permissions[moduleId] === 'write';
}
