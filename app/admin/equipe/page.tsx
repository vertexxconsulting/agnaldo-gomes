'use client';

import React, { useEffect, useState } from 'react';
import { ROLES, Role, ROLE_LABELS } from '@/lib/auth';
import { Plus, UserPlus, X, Search } from 'lucide-react';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/SectionTitle';

import { 
  ADMIN_MODULES, STUDIO_MODULES, LOJA_MODULES, ACADEMY_MODULES, 
  UserPermissions, PermissionLevel, DEFAULT_PERMISSIONS 
} from '@/lib/permissions';

export default function TeamManagementPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', role: 'studio_admin' as Role, permissions: { ...DEFAULT_PERMISSIONS } });
  const [creating, setCreating] = useState(false);
  
  // Modal de edição de permissões
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({});
  
  const [busca, setBusca] = useState('');

  async function safeFetch(url: string, options?: RequestInit) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.error || `Erro ${res.status}`);
      } catch {
        throw new Error(text || `Erro ${res.status}: ${res.statusText}`);
      }
    }
    return res.json();
  }

  async function loadProfiles() {
    setLoading(true);
    try {
      const data = await safeFetch('/api/admin/equipe');
      setProfiles(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Erro loadProfiles:', e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  async function handleChangeRole(userId: string, newRole: Role) {
    setUpdatingId(userId);
    try {
      await safeFetch('/api/admin/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      });
      await loadProfiles();
      alert('Permissão atualizada com sucesso!');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSavePermissions() {
    if (!editingProfile) return;
    setUpdatingId(editingProfile.id);
    try {
      await safeFetch('/api/admin/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingProfile.id, newRole: editingProfile.role, permissions: editPermissions }),
      });
      await loadProfiles();
      alert('Permissões atualizadas com sucesso!');
      setEditingProfile(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCreateUser() {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    setCreating(true);
    try {
      await safeFetch('/api/admin/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      alert('Usuário criado com sucesso!');
      setIsModalOpen(false);
      setNewUser({ email: '', full_name: '', password: '', role: 'studio_admin', permissions: { ...DEFAULT_PERMISSIONS } });
      await loadProfiles();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  }

  const profilesFiltrados = profiles.filter((p) => 
    p.full_name?.toLowerCase().includes(busca.toLowerCase()) || 
    p.email?.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <SectionTitle title="Gestão de Equipe" subtitle="Controle de acessos e hierarquias do sistema" align="left" />

      <div className="flex flex-col sm:flex-row gap-4 mt-8 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Buscar por nome ou e-mail..."
          />
        </div>
        <Button variant="primary" size="md" className="sm:w-auto w-full" onClick={() => setIsModalOpen(true)}>
          <UserPlus size={18} className="mr-2" /> Novo Membro
        </Button>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-foreground/5 text-foreground text-xs font-bold uppercase tracking-widest">
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">E-mail</th>
              <th className="px-6 py-4">Papel Atual</th>
              <th className="px-6 py-4 text-center">Permissões</th>
              <th className="px-6 py-4 text-right">Alterar Acesso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {profilesFiltrados.map((profile) => (
              <tr key={profile.id} className="hover:bg-foreground/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-black text-xs font-bold">
                      {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-foreground font-semibold text-sm">{profile.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-foreground/60 text-sm">{profile.email}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full bg-foreground/10 text-foreground text-xs font-bold border border-foreground/20">
                    {ROLE_LABELS[profile.role as Role] || profile.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setEditingProfile(profile);
                      setEditPermissions(profile.permissions || { ...DEFAULT_PERMISSIONS });
                    }}
                    disabled={updatingId === profile.id || profile.role === ROLES.ADMIN}
                  >
                    Editar
                  </Button>
                </td>
                <td className="px-6 py-4 text-right">
                  <select 
                    value={profile.role}
                    onChange={(e) => handleChangeRole(profile.id, e.target.value as Role)}
                    disabled={updatingId === profile.id}
                    className="bg-background border border-[var(--border-subtle)] text-foreground text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:border-gold/50 transition-all disabled:opacity-50"
                  >
                    {Object.entries(ROLES)
                      .filter(([_, value]) => value === profile.role || (value !== ROLES.ALUNO && value !== ROLES.CUSTOMER))
                      .map(([key, value]) => (
                      <option key={key} value={value}>{ROLE_LABELS[value as Role] || value}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {profilesFiltrados.length === 0 && (
          <div className="py-20 text-center text-foreground/40">
            <p className="text-lg font-medium">Nenhum usuário encontrado.</p>
            <p className="text-sm opacity-60">Use o botão "Novo Membro" para adicionar sua equipe.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] rounded-3xl w-full max-w-md border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-foreground/5">
              <h3 className="text-xl font-bold text-foreground">Adicionar Novo Membro</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-foreground/40 hover:text-foreground transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="block text-xs font-bold text-foreground/60 uppercase mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={newUser.full_name}
                  onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                  className="w-full bg-background border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="block text-xs font-bold text-foreground/60 uppercase mb-1">E-mail Corporativo</label>
                <input 
                  type="email" 
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-background border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="block text-xs font-bold text-foreground/60 uppercase mb-1">Senha Inicial</label>
                <input 
                  type="password" 
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-background border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="block text-xs font-bold text-foreground/60 uppercase mb-1">Papel (Role)</label>
                <select 
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
                  className="w-full bg-background border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  {Object.entries(ROLES)
                    .filter(([_, value]) => value !== ROLES.ALUNO && value !== ROLES.CUSTOMER)
                    .map(([key, value]) => (
                    <option key={key} value={value}>{ROLE_LABELS[value as Role] || value}</option>
                  ))}
                </select>
              </div>

              {/* Tabela de Permissões para Novo Membro */}
              <div className="flex flex-col gap-1 mt-4">
                <label className="block text-xs font-bold text-foreground/60 uppercase mb-2">Permissões de Acesso</label>
                <div className="max-h-64 overflow-y-auto bg-foreground/5 rounded-xl border border-[var(--border-subtle)] p-2 space-y-4">
                  
                  {/* STUDIO */}
                  <div>
                    <h4 className="text-xs font-bold text-gold uppercase mb-2 px-2">Studio (Salão)</h4>
                    <div className="space-y-1">
                      {STUDIO_MODULES.map(mod => (
                        <div key={mod.id} className="flex justify-between items-center text-sm px-2 py-1 border-b border-[var(--border-subtle)] last:border-0">
                          <span className="font-medium text-foreground/80">{mod.label}</span>
                          <select 
                            value={newUser.permissions[mod.id] || 'none'}
                            onChange={(e) => setNewUser({...newUser, permissions: {...newUser.permissions, [mod.id]: e.target.value as PermissionLevel}})}
                            className="bg-background border border-[var(--border-subtle)] text-xs rounded px-2 py-1 outline-none focus:border-gold"
                          >
                            <option value="none">Ocultar</option>
                            <option value="read">Leitura</option>
                            <option value="write">Edição</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LOJA */}
                  <div>
                    <h4 className="text-xs font-bold text-gold uppercase mb-2 px-2 mt-4">Loja Física / E-commerce</h4>
                    <div className="space-y-1">
                      {LOJA_MODULES.map(mod => (
                        <div key={mod.id} className="flex justify-between items-center text-sm px-2 py-1 border-b border-[var(--border-subtle)] last:border-0">
                          <span className="font-medium text-foreground/80">{mod.label}</span>
                          <select 
                            value={newUser.permissions[mod.id] || 'none'}
                            onChange={(e) => setNewUser({...newUser, permissions: {...newUser.permissions, [mod.id]: e.target.value as PermissionLevel}})}
                            className="bg-background border border-[var(--border-subtle)] text-xs rounded px-2 py-1 outline-none focus:border-gold"
                          >
                            <option value="none">Ocultar</option>
                            <option value="read">Leitura</option>
                            <option value="write">Edição</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ACADEMY */}
                  <div>
                    <h4 className="text-xs font-bold text-gold uppercase mb-2 px-2 mt-4">Academy (Cursos)</h4>
                    <div className="space-y-1">
                      {ACADEMY_MODULES.map(mod => (
                        <div key={mod.id} className="flex justify-between items-center text-sm px-2 py-1 border-b border-[var(--border-subtle)] last:border-0">
                          <span className="font-medium text-foreground/80">{mod.label}</span>
                          <select 
                            value={newUser.permissions[mod.id] || 'none'}
                            onChange={(e) => setNewUser({...newUser, permissions: {...newUser.permissions, [mod.id]: e.target.value as PermissionLevel}})}
                            className="bg-background border border-[var(--border-subtle)] text-xs rounded px-2 py-1 outline-none focus:border-gold"
                          >
                            <option value="none">Ocultar</option>
                            <option value="read">Leitura</option>
                            <option value="write">Edição</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              <button 
                onClick={handleCreateUser}
                disabled={creating}
                className="w-full bg-gold text-black py-3 rounded-xl font-bold hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {creating ? 'Criando...' : <><UserPlus size={20} /> Criar Acesso</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Permissões */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] rounded-3xl w-full max-w-md border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-foreground/5 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-foreground">Permissões de Acesso</h3>
                <p className="text-xs text-foreground/60 mt-1">{editingProfile.full_name}</p>
              </div>
              <button onClick={() => setEditingProfile(null)} className="text-foreground/40 hover:text-foreground transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* STUDIO */}
              <div>
                <h4 className="text-xs font-bold text-gold uppercase mb-2">Studio (Salão)</h4>
                <div className="space-y-1">
                  {STUDIO_MODULES.map(mod => (
                    <div key={mod.id} className="flex justify-between items-center text-sm px-3 py-2 bg-foreground/5 rounded-lg border border-[var(--border-subtle)]">
                      <span className="font-medium text-foreground/80">{mod.label}</span>
                      <select 
                        value={editPermissions[mod.id] || 'none'}
                        onChange={(e) => setEditPermissions({...editPermissions, [mod.id]: e.target.value as PermissionLevel})}
                        className="bg-background border border-[var(--border-subtle)] text-xs rounded px-2 py-1.5 outline-none focus:border-gold"
                      >
                        <option value="none">Ocultar</option>
                        <option value="read">Leitura</option>
                        <option value="write">Edição</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* LOJA */}
              <div>
                <h4 className="text-xs font-bold text-gold uppercase mb-2">Loja Física / E-commerce</h4>
                <div className="space-y-1">
                  {LOJA_MODULES.map(mod => (
                    <div key={mod.id} className="flex justify-between items-center text-sm px-3 py-2 bg-foreground/5 rounded-lg border border-[var(--border-subtle)]">
                      <span className="font-medium text-foreground/80">{mod.label}</span>
                      <select 
                        value={editPermissions[mod.id] || 'none'}
                        onChange={(e) => setEditPermissions({...editPermissions, [mod.id]: e.target.value as PermissionLevel})}
                        className="bg-background border border-[var(--border-subtle)] text-xs rounded px-2 py-1.5 outline-none focus:border-gold"
                      >
                        <option value="none">Ocultar</option>
                        <option value="read">Leitura</option>
                        <option value="write">Edição</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACADEMY */}
              <div>
                <h4 className="text-xs font-bold text-gold uppercase mb-2">Academy (Cursos)</h4>
                <div className="space-y-1">
                  {ACADEMY_MODULES.map(mod => (
                    <div key={mod.id} className="flex justify-between items-center text-sm px-3 py-2 bg-foreground/5 rounded-lg border border-[var(--border-subtle)]">
                      <span className="font-medium text-foreground/80">{mod.label}</span>
                      <select 
                        value={editPermissions[mod.id] || 'none'}
                        onChange={(e) => setEditPermissions({...editPermissions, [mod.id]: e.target.value as PermissionLevel})}
                        className="bg-background border border-[var(--border-subtle)] text-xs rounded px-2 py-1.5 outline-none focus:border-gold"
                      >
                        <option value="none">Ocultar</option>
                        <option value="read">Leitura</option>
                        <option value="write">Edição</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            <div className="p-6 border-t border-[var(--border-subtle)] bg-foreground/5 shrink-0">
              <button 
                onClick={handleSavePermissions}
                disabled={updatingId === editingProfile.id}
                className="w-full bg-gold text-black py-3 rounded-xl font-bold hover:bg-white transition-all disabled:opacity-50"
              >
                {updatingId === editingProfile.id ? 'Salvando...' : 'Salvar Permissões'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
