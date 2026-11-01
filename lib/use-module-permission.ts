'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserRole, isOwner, ROLES } from '@/lib/auth';
import { canEdit, canAccess, AdminModuleId, UserPermissions, PermissionLevel } from '@/lib/permissions';

export interface ModulePermissionResult {
  level: PermissionLevel;
  canWrite: boolean;
  canRead: boolean;
  isReadOnly: boolean;
  hasNoAccess: boolean;
  loading: boolean;
  isSuperAdmin: boolean;
}

export function useModulePermission(moduleId: AdminModuleId): ModulePermissionResult {
  const [level, setLevel] = useState<PermissionLevel>('write');
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkPermission() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) {
            setLevel('none');
            setLoading(false);
          }
          return;
        }

        // Se for o proprietário do sistema, tem escrita irrestrita
        if (isOwner(user)) {
          if (mounted) {
            setIsSuperAdmin(true);
            setLevel('write');
            setLoading(false);
          }
          return;
        }

        // Busca o perfil atualizado do banco de dados (profiles)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, permissions')
          .eq('id', user.id)
          .maybeSingle();

        const role = profile?.role || getUserRole(user);
        const perms: UserPermissions = profile?.permissions || user.user_metadata?.permissions || {};

        // Se for ADMIN global e NÃO tiver restrição explícita configurada no módulo
        if ((role === ROLES.ADMIN || user.user_metadata?.isOwner === true) && !perms[moduleId]) {
          if (mounted) {
            setIsSuperAdmin(true);
            setLevel('write');
            setLoading(false);
          }
          return;
        }

        // 1. Permissão explícita no perfil (configurada na Gestão de Equipe)
        if (perms[moduleId]) {
          if (mounted) {
            setLevel(perms[moduleId] as PermissionLevel);
            setLoading(false);
          }
          return;
        }

        // 2. Avaliação de canEdit e canAccess
        const hasAccess = canAccess(perms, moduleId, role);
        const hasEdit = canEdit(perms, moduleId, role);

        if (!hasAccess) {
          if (mounted) setLevel('none');
        } else if (hasEdit) {
          if (mounted) setLevel('write');
        } else {
          if (mounted) setLevel('read');
        }
      } catch (err) {
        console.warn(`[useModulePermission] Erro ao carregar permissão de ${moduleId}:`, err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkPermission();

    return () => {
      mounted = false;
    };
  }, [moduleId]);

  const canWrite = level === 'write';
  const canRead = level === 'read' || level === 'write';
  const isReadOnly = level === 'read';
  const hasNoAccess = level === 'none';

  return {
    level,
    canWrite,
    canRead,
    isReadOnly,
    hasNoAccess,
    loading,
    isSuperAdmin,
  };
}
