'use client';

import React, { useEffect, useState } from 'react';
import { ROLES, Role, ROLE_LABELS } from '@/lib/auth';
import { Plus, UserPlus, X, Search, Scissors, Shield, Sparkles, CheckCircle2, Lock, UserCheck } from 'lucide-react';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/SectionTitle';
import { fetchProfissionais } from '@/lib/supabase-queries';
import type { Profissional } from '@/lib/gestao-types';

import { 
  ADMIN_MODULES, STUDIO_MODULES, LOJA_MODULES, ACADEMY_MODULES, 
  UserPermissions, PermissionLevel, DEFAULT_PERMISSIONS 
} from '@/lib/permissions';

export default function TeamManagementPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [profissionaisSalao, setProfissionaisSalao] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tipoAcesso, setTipoAcesso] = useState<'profissional' | 'administrativo'>('profissional');
  const [selectedProfissionalId, setSelectedProfissionalId] = useState<string>('');
  const [newUser, setNewUser] = useState({ 
    email: '', 
    full_name: '', 
    password: '', 
    role: 'studio_profissional' as Role, 
    nickname: '', 
    avatar_url: '',
    professional_id: '',
    permissions: { ...DEFAULT_PERMISSIONS } 
  });
  const [creating, setCreating] = useState(false);
  
  // Modal de edição de permissões
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [editingNickname, setEditingNickname] = useState('');
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
      const [data, nickData, profs] = await Promise.all([
        safeFetch('/api/admin/equipe'),
        safeFetch('/api/admin/nicknames').catch(() => ({ nicknames: {} })),
        fetchProfissionais().catch(() => []),
      ]);
      setProfiles(Array.isArray(data) ? data : []);
      setNicknames(nickData?.nicknames || {});
      setProfissionaisSalao((profs || []).filter(p => p.ativo));
    } catch (e: any) {
      console.error('Erro loadProfiles:', e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  const getNicknameDisplay = (profile: any) => {
    // 1. Nickname explícito no perfil (permissions ou retornado da API)
    const directNick = (profile.permissions as any)?.nickname || profile.nickname;
    if (directNick && typeof directNick === 'string' && directNick.trim()) {
      return directNick.trim().toLowerCase();
    }

    // 2. Mapa global de nicknames cadastrados
    if (profile.email) {
      const emailLower = profile.email.toLowerCase().trim();
      for (const [nick, email] of Object.entries(nicknames)) {
        if (typeof email === 'string' && email.toLowerCase().trim() === emailLower) {
          return nick.toLowerCase();
        }
      }
    }

    // 3. Fallback para primeiro nome ou sem-apelido
    return profile.full_name?.split(' ')[0]?.toLowerCase() || 'sem-apelido';
  };

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
      const permsToSave = { ...editPermissions };
      const nickToSave = editingNickname.trim().toLowerCase();
      if (nickToSave) {
        (permsToSave as any).nickname = nickToSave;
        await safeFetch('/api/admin/nicknames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: editingProfile.email, nickname: nickToSave }),
        }).catch(err => console.warn('Aviso ao salvar nickname:', err));
      }

      await safeFetch('/api/admin/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: editingProfile.id, 
          newRole: editingProfile.role, 
          permissions: permsToSave,
          nickname: nickToSave || undefined,
        }),
      });
      await loadProfiles();
      alert('Permissões e apelido atualizados com sucesso!');
      setEditingProfile(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const selectedProfissional = profissionaisSalao.find(p => p.id === selectedProfissionalId) || null;

  function handleSelectProfissional(profId: string) {
    setSelectedProfissionalId(profId);
    if (!profId) {
      setNewUser(prev => ({
        ...prev,
        full_name: '',
        nickname: '',
        email: '',
        avatar_url: '',
        professional_id: '',
      }));
      return;
    }

    const prof = profissionaisSalao.find(p => p.id === profId);
    if (prof) {
      const primeiroNome = (prof.nome || '')
        .trim()
        .split(' ')[0]
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

      const fotoUrl = prof.foto_url || '';
      const emailSugerido = `${primeiroNome}@agnaldogomes.com`;

      setNewUser(prev => ({
        ...prev,
        full_name: prof.nome,
        nickname: primeiroNome,
        email: prev.email && !prev.email.includes('@agnaldogomes.com') ? prev.email : emailSugerido,
        avatar_url: fotoUrl,
        professional_id: prof.id,
        role: ROLES.STUDIO_PROFISSIONAL,
        permissions: {
          ...DEFAULT_PERMISSIONS,
          agenda: 'write',
          meu_painel: 'write',
          clientes: 'read',
          comissoes: 'read',
        }
      }));
    }
  }

  async function handleCreateUser() {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      alert('Preencha os campos obrigatórios (Nome, E-mail e Senha).');
      return;
    }

    setCreating(true);
    try {
      const perms = { ...newUser.permissions };
      if (newUser.nickname.trim()) {
        (perms as any).nickname = newUser.nickname.trim().toLowerCase();
      }
      if (newUser.professional_id || selectedProfissionalId) {
        (perms as any).professional_id = newUser.professional_id || selectedProfissionalId;
      }

      await safeFetch('/api/admin/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newUser, 
          permissions: perms,
          avatar_url: newUser.avatar_url,
          professional_id: newUser.professional_id || selectedProfissionalId,
        }),
      });

      if (newUser.nickname.trim()) {
        await safeFetch('/api/admin/nicknames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newUser.email, nickname: newUser.nickname.trim() }),
        }).catch(err => console.warn('Aviso ao registrar nickname:', err));
      }

      alert('Usuário criado com sucesso!');
      setIsModalOpen(false);
      setSelectedProfissionalId('');
      setNewUser({ 
        email: '', 
        full_name: '', 
        password: '', 
        role: 'studio_profissional', 
        nickname: '', 
        avatar_url: '',
        professional_id: '',
        permissions: { ...DEFAULT_PERMISSIONS } 
      });
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
        <Button variant="primary" size="md" className="sm:w-auto w-full" onClick={() => {
          setTipoAcesso('profissional');
          setSelectedProfissionalId('');
          setIsModalOpen(true);
        }}>
          <UserPlus size={18} className="mr-2" /> Novo Membro
        </Button>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-foreground/5 text-foreground text-xs font-bold uppercase tracking-widest">
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">Nickname</th>
              <th className="px-6 py-4">E-mail</th>
              <th className="px-6 py-4 text-center">Permissões</th>
              <th className="px-6 py-4 text-right">Alterar Acesso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {profilesFiltrados.map((profile) => (
              <tr key={profile.id} className="hover:bg-foreground/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name || 'Usuário'} className="w-8 h-8 rounded-full object-cover border border-gold/30" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-black text-xs font-bold">
                        {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <span className="text-foreground font-semibold text-sm">{profile.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-lg bg-gold/15 text-gold text-xs font-mono font-bold border border-gold/30">
                    @{getNicknameDisplay(profile)}
                  </span>
                </td>
                <td className="px-6 py-4 text-foreground/60 text-sm">{profile.email}</td>
                <td className="px-6 py-4 text-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setEditingProfile(profile);
                      setEditingNickname(getNicknameDisplay(profile));
                      setEditPermissions(profile.permissions || { ...DEFAULT_PERMISSIONS });
                    }}
                    disabled={updatingId === profile.id}
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
          <div className="bg-[var(--color-card)] rounded-3xl w-full max-w-lg border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-foreground/5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gold/15 text-gold flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Criar Acesso ao Sistema</h3>
                  <p className="text-[11px] text-foreground/60">Configure o login e perfil do membro da equipe</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-foreground/40 hover:text-foreground transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Seleção do Tipo de Acesso: Profissional vs Administrativo */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-foreground/5 rounded-2xl border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => {
                    setTipoAcesso('profissional');
                    setNewUser(prev => ({
                      ...prev,
                      role: ROLES.STUDIO_PROFISSIONAL,
                    }));
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    tipoAcesso === 'profissional'
                      ? 'bg-gold text-black shadow-md'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  <Scissors size={14} /> Profissional do Salão
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoAcesso('administrativo');
                    setSelectedProfissionalId('');
                    setNewUser(prev => ({
                      ...prev,
                      role: 'studio_admin',
                      avatar_url: '',
                      professional_id: '',
                    }));
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    tipoAcesso === 'administrativo'
                      ? 'bg-gold text-black shadow-md'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  <Shield size={14} /> Cargo Administrativo
                </button>
              </div>

              {/* FLUXO 1: Profissional do Salão (Seleção Direta e Auto-preenchimento) */}
              {tipoAcesso === 'profissional' ? (
                <div className="space-y-4">
                  
                  {/* Seletor de Profissional Cadastrado */}
                  <div className="p-3.5 rounded-2xl bg-gold/10 border border-gold/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={14} className="text-gold" /> Qual profissional receberá o acesso?
                      </label>
                      <span className="text-[10px] text-foreground/50 font-medium">
                        {profissionaisSalao.length} profissionais ativos
                      </span>
                    </div>

                    <select
                      value={selectedProfissionalId}
                      onChange={(e) => handleSelectProfissional(e.target.value)}
                      className="w-full bg-[var(--color-card)] border border-gold/40 focus:border-gold rounded-xl px-3.5 py-2.5 text-sm font-bold text-foreground outline-none shadow-sm cursor-pointer"
                    >
                      <option value="">Selecione um profissional cadastrado...</option>
                      {profissionaisSalao.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} — {p.categoria || 'Profissional'}
                        </option>
                      ))}
                    </select>

                    {/* Preview e Confirmação da Foto do Cadastro */}
                    {selectedProfissional && (
                      <div className="mt-2.5 p-3 rounded-xl bg-[var(--color-card)] border border-emerald-500/30 flex items-center gap-3 animate-in fade-in">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gold/60 bg-foreground/5 shrink-0 relative shadow">
                          {selectedProfissional.foto_url ? (
                            <img src={selectedProfissional.foto_url} alt={selectedProfissional.nome} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gold/20 text-gold font-bold text-sm">
                              {selectedProfissional.nome.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-foreground truncate">{selectedProfissional.nome}</p>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 font-bold">
                              ✓ Foto Vinculada
                            </span>
                          </div>
                          <p className="text-[10px] text-foreground/60 truncate mt-0.5">
                            Foto e dados carregados automaticamente do cadastro do salão.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aviso de facilidade */}
                  <div className="px-3 py-2 rounded-xl bg-foreground/5 border border-[var(--border-subtle)] text-[11px] text-foreground/70 flex items-center gap-2">
                    <UserCheck size={14} className="text-gold shrink-0" />
                    <span>
                      {selectedProfissional 
                        ? 'Os dados e a foto de perfil já vieram definidos. Defina apenas a Senha Inicial abaixo.' 
                        : 'Selecione um profissional acima para carregar automaticamente o nome e a foto de perfil.'}
                    </span>
                  </div>

                  {/* Nome Completo (Auto-preenchido) */}
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-bold text-foreground/60 uppercase">Nome Completo</label>
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        value={newUser.full_name}
                        readOnly={Boolean(selectedProfissional)}
                        onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                        className={`w-full bg-background border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-foreground outline-none text-sm font-medium ${
                          selectedProfissional ? 'opacity-80 bg-foreground/[0.03] cursor-not-allowed' : ''
                        }`}
                        placeholder="Selecione o profissional acima..."
                      />
                      {selectedProfissional && (
                        <span className="absolute right-3 text-gold text-xs font-bold flex items-center gap-1">
                          <Lock size={12} /> Do Cadastro
                        </span>
                      )}
                    </div>
                  </div>

                  {/* E-mail de Login */}
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-bold text-foreground/60 uppercase">E-mail de Acesso</label>
                    <input 
                      type="email" 
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                      className="w-full bg-background border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium"
                      placeholder="email@agnaldogomes.com"
                    />
                  </div>

                  {/* Nickname de Login */}
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-bold text-foreground/60 uppercase">Apelido / Nickname (Permite entrar sem digitar e-mail)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-gold font-bold text-sm">@</span>
                      <input 
                        type="text" 
                        value={newUser.nickname}
                        onChange={e => setNewUser({...newUser, nickname: e.target.value})}
                        className="w-full bg-background border border-[var(--border-subtle)] rounded-xl pl-8 pr-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-mono text-sm"
                        placeholder="ex: edinaldo"
                      />
                    </div>
                  </div>

                  {/* Senha Inicial (Principal campo a preencher) */}
                  <div className="flex flex-col gap-1 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                    <label className="block text-xs font-bold text-amber-900 uppercase">
                      🔑 Senha Inicial de Acesso (Obrigatório)
                    </label>
                    <input 
                      type="password" 
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      className="w-full bg-[var(--color-card)] border border-amber-500/40 rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm font-mono"
                      placeholder="Defina uma senha provisória..."
                    />
                    <p className="text-[10px] text-amber-900/80 mt-0.5">
                      O profissional utilizará essa senha no login (com o e-mail ou com o @nickname).
                    </p>
                  </div>
                </div>
              ) : (
                /* FLUXO 2: Cargo Administrativo Tradicional (Gestor, Secretária, etc.) */
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-bold text-foreground/60 uppercase">Nome Completo</label>
                    <input 
                      type="text" 
                      value={newUser.full_name}
                      onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                      className="w-full bg-background border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium"
                      placeholder="Ex: Maria Secretária"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-bold text-foreground/60 uppercase">E-mail Corporativo</label>
                    <input 
                      type="email" 
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                      className="w-full bg-background border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium"
                      placeholder="maria@empresa.com"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-bold text-foreground/60 uppercase">Nickname de Login (Opcional)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-gold font-bold text-sm">@</span>
                      <input 
                        type="text" 
                        value={newUser.nickname}
                        onChange={e => setNewUser({...newUser, nickname: e.target.value})}
                        className="w-full bg-background border border-[var(--border-subtle)] rounded-xl pl-8 pr-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all font-mono text-sm"
                        placeholder="ex: maria"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-bold text-foreground/60 uppercase">Senha Inicial</label>
                    <input 
                      type="password" 
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      className="w-full bg-background border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-bold text-foreground/60 uppercase">Papel (Role)</label>
                    <select 
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
                      className="w-full bg-background border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium cursor-pointer"
                    >
                      {Object.entries(ROLES)
                        .filter(([_, value]) => value !== ROLES.ALUNO && value !== ROLES.CUSTOMER && value !== ROLES.STUDIO_PROFISSIONAL)
                        .map(([key, value]) => (
                        <option key={key} value={value}>{ROLE_LABELS[value as Role] || value}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tabela de Permissões Granulares */}
                  <div className="flex flex-col gap-1 mt-4">
                    <label className="block text-xs font-bold text-foreground/60 uppercase mb-1">Permissões de Acesso</label>
                    <div className="max-h-56 overflow-y-auto bg-foreground/5 rounded-xl border border-[var(--border-subtle)] p-2 space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-gold uppercase mb-1.5 px-2">Studio (Salão)</h4>
                        <div className="space-y-1">
                          {STUDIO_MODULES.map(mod => (
                            <div key={mod.id} className="flex justify-between items-center text-xs px-2 py-1 border-b border-[var(--border-subtle)] last:border-0">
                              <span className="font-medium text-foreground/80">{mod.label}</span>
                              <select 
                                value={newUser.permissions[mod.id] || 'none'}
                                onChange={(e) => setNewUser({...newUser, permissions: {...newUser.permissions, [mod.id]: e.target.value as PermissionLevel}})}
                                className="bg-background border border-[var(--border-subtle)] text-[11px] rounded px-2 py-1 outline-none focus:border-gold"
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
                </div>
              )}

            </div>

            <div className="p-5 border-t border-[var(--border-subtle)] bg-foreground/5 shrink-0">
              <button 
                onClick={handleCreateUser}
                disabled={creating || (tipoAcesso === 'profissional' && !newUser.full_name)}
                className="w-full bg-gold text-black py-3 rounded-xl font-bold hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg text-sm"
              >
                {creating ? 'Criando Acesso...' : (
                  <>
                    <UserPlus size={18} />
                    {tipoAcesso === 'profissional' 
                      ? (selectedProfissional ? `Criar Acesso de ${selectedProfissional.nome.split(' ')[0]}` : 'Criar Acesso do Profissional')
                      : 'Criar Acesso Administrativo'}
                  </>
                )}
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
              {/* Nickname de Login */}
              <div className="p-4 bg-foreground/5 rounded-2xl border border-[var(--border-subtle)]">
                <label className="block text-xs font-bold text-gold uppercase mb-1.5">Nickname de Acesso (@)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gold font-bold text-sm">@</span>
                  <input 
                    type="text"
                    value={editingNickname}
                    onChange={e => setEditingNickname(e.target.value)}
                    placeholder="ex: agnaldo"
                    className="flex-1 bg-background border border-[var(--border-subtle)] text-foreground text-sm rounded-xl pl-8 pr-3 py-2 outline-none focus:border-gold font-mono"
                  />
                </div>
                <p className="text-[11px] text-foreground/50 mt-1.5">
                  Permite entrar no sistema digitando apenas este apelido ao invés do e-mail.
                </p>
              </div>

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
