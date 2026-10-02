'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, GripVertical, Edit2, Trash2, Video, FileText, Loader2, CreditCard, Wallet, CheckCircle, AlertTriangle, UploadCloud } from 'lucide-react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/ImageUpload';

interface Curso {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration_hours: number;
  level: string;
  tags: string[];
  stripe_payment_link?: string;
  price?: number;
  certificate_bg_url?: string;
}

interface Modulo {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
}

interface Aula {
  id: string;
  module_id: string;
  title: string;
  video_url: string;
  duration_minutes: number;
  order_index: number;
}

type ModuloComAulas = Modulo & { aulas: Aula[] };

export default function AdminEdicaoCursoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cursoId = params.cursoId as string;

  // Tab persistence via URL
  const initialTab = (searchParams.get('tab') as 'detalhes' | 'modulos' | 'pagamento') || 'detalhes';
  const [activeTab, setActiveTab] = useState<'detalhes' | 'modulos' | 'pagamento'>(initialTab);

  const handleTabChange = (tab: 'detalhes' | 'modulos' | 'pagamento') => {
    setActiveTab(tab);
    router.replace(`/admin-academy/cursos/${cursoId}?tab=${tab}`, { scroll: false });
  };

  // Modal states (replaces prompt())
  const [isModuloModalOpen, setIsModuloModalOpen] = useState(false);
  const [isAulaModalOpen, setIsAulaModalOpen] = useState(false);
  const [moduloTitleInput, setModuloTitleInput] = useState('');
  const [aulaTitleInput, setAulaTitleInput] = useState('');
  const [aulaModuleId, setAulaModuleId] = useState('');

  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<ModuloComAulas[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; paymentLink?: string; error?: string } | null>(null);
  const [cursoForm, setCursoForm] = useState({ title: '', description: '', thumbnail_url: '', certificate_bg_url: '', stripe_payment_link: '', price: 0, current_price: null as number | null, original_price: null as number | null });

  const isCreatingPayment = paymentLoading;

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoForm.price || cursoForm.price <= 0) return;
    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: cursoForm.price, current_price: cursoForm.current_price, original_price: cursoForm.original_price }),
      });
      const data = await res.json();
      setPaymentResult(data);
      if (data.success && data.paymentLink) {
        setCursoForm(prev => ({ ...prev, stripe_payment_link: data.paymentLink }));
      }
    } catch (err) {
      setPaymentResult({ success: false, error: 'Erro de conexão' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [cursoRes, modulosRes, aulasRes] = await Promise.all([
        fetch(`/api/admin-academy/cursos/${cursoId}`),
        fetch(`/api/admin-academy/cursos/${cursoId}/modulos`),
        fetch(`/api/admin-academy/cursos/${cursoId}/aulas`),
      ]);

      if (cursoRes.ok) {
        const c = await cursoRes.json();
        setCurso(c);
        setCursoForm({
          title: c.title,
          description: c.description || '',
          thumbnail_url: c.thumbnail_url || '',
          certificate_bg_url: c.certificate_bg_url || '',
          stripe_payment_link: c.stripe_payment_link || '',
          price: c.price || 0,
          current_price: c.current_price || null,
          original_price: c.original_price || null,
        });
      }

      if (modulosRes.ok && aulasRes.ok) {
        const mods = await modulosRes.json();
        const aulas = await aulasRes.json();
        const modsComAulas: ModuloComAulas[] = mods.map((m: Modulo) => ({
          ...m,
          aulas: aulas.filter((a: Aula) => a.module_id === m.id).sort((a: Aula, b: Aula) => a.order_index - b.order_index),
        }));
        setModulos(modsComAulas);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
    setLoading(false);
  }, [cursoId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleSaveCurso = async () => {
    if (!curso) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cursoForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurso(updated.curso);
        alert('Curso salvo com sucesso!');
      } else {
        const err = await res.json();
        alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao salvar curso:', err);
      alert('Erro de conexão');
    }
    setSaving(false);
  };

  // MODAL: substitui prompt() para criar módulo
  const handleCreateModuloSubmit = async () => {
    if (!moduloTitleInput.trim()) return;
    setIsModuloModalOpen(false);
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/modulos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: moduloTitleInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setModulos(prev => [...prev, { ...data.modulo, aulas: [] }]);
      } else {
        const err = await res.json();
        alert('Erro ao criar módulo: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao criar módulo:', err);
      alert('Erro de conexão');
    } finally {
      setModuloTitleInput('');
    }
  };

  const handleUpdateModulo = async (moduloId: string, title: string) => {
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/modulos/${moduloId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        carregarDados();
      } else {
        const err = await res.json();
        alert('Erro ao atualizar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao atualizar módulo:', err);
      alert('Erro de conexão');
    }
  };

  const handleDeleteModulo = async (moduloId: string) => {
    if (!confirm('Excluir este módulo e todas as suas aulas?')) return;
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/modulos/${moduloId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setModulos(prev => prev.filter(m => m.id !== moduloId));
      } else {
        const err = await res.json();
        alert('Erro ao excluir: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao excluir módulo:', err);
      alert('Erro de conexão');
    }
  };

  const handleCreatePayment = async () => {
    if (!curso) return;
    setPaymentLoading(true);
    setPaymentResult(null);
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentResult({ success: true, paymentLink: data.paymentLink });
        setCursoForm(prev => ({ ...prev, stripe_payment_link: data.paymentLink }));
      } else {
        setPaymentResult({ success: false, error: data.error || 'Falha ao criar payment.' });
      }
    } catch (err) {
      setPaymentResult({ success: false, error: 'Erro de conexão ao criar Stripe Price.' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCreateAulaSubmit = async () => {
    if (!aulaTitleInput.trim() || !aulaModuleId) return;
    const moduloId = aulaModuleId;
    // Reset
    setIsAulaModalOpen(false);
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/aulas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: moduloId, title: aulaTitleInput.trim() }),
      });
      if (res.ok) {
        carregarDados();
      } else {
        const err = await res.json();
        alert('Erro ao criar aula: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao criar aula:', err);
      alert('Erro de conexão');
    } finally {
      setAulaTitleInput('');
    }
  };

  const handleUpdateAula = async (aulaId: string, data: Partial<Aula>) => {
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/aulas/${aulaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        carregarDados();
      } else {
        const err = await res.json();
        alert('Erro ao atualizar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao atualizar aula:', err);
      alert('Erro de conexão');
    }
  };

  const handleDeleteAula = async (aulaId: string) => {
    if (!confirm('Excluir esta aula?')) return;
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/aulas/${aulaId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        carregarDados();
      } else {
        const err = await res.json();
        alert('Erro ao excluir: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao excluir aula:', err);
      alert('Erro de conexão');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-6 bg-gold/10 rounded w-48 animate-pulse mb-2" />
        <div className="h-5 bg-gold/10 rounded w-64 animate-pulse" />
      </div>
    );
  }

  if (!curso) {
    return <div className="p-6 text-foreground">Curso não encontrado.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header Fixo */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-gold/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin-academy/cursos" className="p-2 hover:bg-foreground/5 rounded-full text-foreground/70 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Editar Curso</h1>
            <p className="text-sm text-foreground/60">{curso.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={carregarDados} disabled={loading}>Recarregar</Button>
          <Button variant="primary" className="flex items-center gap-2" onClick={handleSaveCurso} disabled={saving}>
            <Save size={16} /> {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex border-b border-gold/10 mb-6">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'detalhes' ? 'text-gold' : 'text-foreground/60 hover:text-foreground'}`}
            onClick={() => handleTabChange('detalhes')}
          >
            Detalhes do Curso
            {activeTab === 'detalhes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'modulos' ? 'text-gold' : 'text-foreground/60 hover:text-foreground'}`}
            onClick={() => handleTabChange('modulos')}
          >
            Módulos e Aulas
            {activeTab === 'modulos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'pagamento' ? 'text-gold' : 'text-foreground/60 hover:text-foreground'}`}
            onClick={() => handleTabChange('pagamento')}
          >
            Pagamento
            {activeTab === 'pagamento' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
          </button>
        </div>

        {/* Tab Detalhes */}
        {activeTab === 'detalhes' && (
          <div className="space-y-6">
            <div className="bg-card-bg border border-gold/20 p-6 rounded-xl">
              <h2 className="text-lg font-bold text-foreground mb-4">Informações Básicas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Título do Curso</label>
                    <input
                      type="text"
                      value={cursoForm.title}
                      onChange={e => setCursoForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-background border border-gold/20 rounded-lg p-3 text-sm text-foreground focus:border-gold outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Descrição</label>
                    <textarea
                      value={cursoForm.description}
                      onChange={e => setCursoForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full bg-background border border-gold/20 rounded-lg p-3 text-sm text-foreground focus:border-gold outline-none transition-colors resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground/70 mb-1">Preço (R$)</label>
                      <input
                        type="number"
                        value={cursoForm.price}
                        onChange={e => setCursoForm(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                        className="w-full bg-background border border-gold/20 rounded-lg p-3 text-sm text-foreground focus:border-gold outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/70 mb-1">Link Stripe (Opcional)</label>
                      <input
                        type="url"
                        placeholder="https://buy.stripe.com/..."
                        value={cursoForm.stripe_payment_link}
                        onChange={e => setCursoForm(prev => ({ ...prev, stripe_payment_link: e.target.value }))}
                        className="w-full bg-background border border-gold/20 rounded-lg p-3 text-sm text-foreground focus:border-gold outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Capa do Curso</label>
                    <ImageUpload
                      value={cursoForm.thumbnail_url}
                      onChange={(url) => setCursoForm(prev => ({ ...prev, thumbnail_url: url }))}
                      folder={`cursos/${cursoId}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">
                      Template do Certificado (Recomendado A4 Paisagem 3508x2480px)
                    </label>
                    <p className="text-xs text-foreground/50 mb-2">
                      Faça o upload do fundo do certificado (sem os nomes). O sistema vai escrever o nome do aluno, curso e data automaticamente.
                    </p>
                    <ImageUpload
                      value={cursoForm.certificate_bg_url}
                      onChange={(url) => setCursoForm(prev => ({ ...prev, certificate_bg_url: url }))}
                      folder={`cursos/${cursoId}/certificates`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Modulos */}
        {activeTab === 'modulos' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" className="flex items-center gap-2" onClick={() => { setModuloTitleInput(''); setIsModuloModalOpen(true); }}>
                <Plus size={16} /> Novo Módulo
              </Button>
            </div>

            <div className="space-y-4">
              {modulos.map((modulo, mIndex) => (
                <div key={modulo.id} className="bg-card-bg border border-gold/20 rounded-xl overflow-hidden">
                  <ModuloCard
                    modulo={modulo}
                    index={mIndex}
                    cursoId={cursoId}
                    onUpdate={handleUpdateModulo}
                    onDelete={handleDeleteModulo}
                    onCreateAula={(moduleId) => {
                      setAulaTitleInput('');
                      setAulaModuleId(moduleId);
                      setIsAulaModalOpen(true);
                    }}
                    onUpdateAula={handleUpdateAula}
                    onDeleteAula={handleDeleteAula}
                  />
                </div>
              ))}
            </div>

            {modulos.length === 0 && (
              <div className="text-center py-12 text-foreground/50 border-2 border-dashed border-gold/20 rounded-xl">
                Nenhum módulo ainda. Clique em "Novo Módulo" para começar.
              </div>
            )}
          </div>
        )}

        {/* Tab Pagamento */}
        {activeTab === 'pagamento' && (
          <div className="space-y-6">
            <div className="bg-card-bg border border-gold/20 p-6 rounded-xl">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-gold" />
                Configuração de Pagamento Stripe
              </h2>
              <p className="text-sm text-foreground/60 mb-6">
                Crie um Stripe Price e Payment Link para este curso. O link gerado será salvo automaticamente no curso e usado pelo checkout da área do aluno.
              </p>

              {paymentResult?.error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                  <AlertTriangle size={16} className="text-red-500" />
                  <span className="text-sm text-red-500">{paymentResult.error}</span>
                </div>
              )}

              {/* Status do link atual */}
              {cursoForm.stripe_payment_link ? (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                    <CheckCircle size={16} /> Payment Link ativo
                  </p>
                  <code className="text-xs text-foreground/70 break-all mb-3">{cursoForm.stripe_payment_link}</code>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-gold/10 border border-gold/20 rounded-lg flex items-center gap-3">
                  <AlertTriangle size={16} className="text-gold" />
                  <span className="text-sm text-foreground/60">Nenhum Payment Link configurado ainda.</span>
                </div>
              )}

              <form onSubmit={handlePaymentSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Preço do curso (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cursoForm.price || ''}
                      onChange={e => setCursoForm({ ...cursoForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-gold/20 text-foreground focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Preço promocional (R$) (opcional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cursoForm.current_price ?? ''}
                      onChange={e => setCursoForm({ ...cursoForm, current_price: parseFloat(e.target.value) || null })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-gold/20 text-foreground focus:border-gold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Preço original (R$) (para cálculo de desconto)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cursoForm.original_price ?? ''}
                      onChange={e => setCursoForm({ ...cursoForm, original_price: parseFloat(e.target.value) || null })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-gold/20 text-foreground focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingPayment}
                  className="w-full py-2.5 mt-4 rounded-lg bg-gold text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-gold-dim disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  {isCreatingPayment ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Wallet size={16} />
                      Criar Stripe Price + Payment Link
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      <Modal
        isOpen={isModuloModalOpen}
        onClose={() => setIsModuloModalOpen(false)}
        title="Novo Módulo"
        description="Crie um novo módulo para organizar as aulas deste curso."
      >
        <div className="space-y-4 pt-2">
          <input
            type="text"
            placeholder="Título do módulo"
            value={moduloTitleInput}
            onChange={e => setModuloTitleInput(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-gold/20 text-foreground focus:border-gold outline-none text-sm"
            onKeyDown={e => e.key === 'Enter' && handleCreateModuloSubmit()}
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsModuloModalOpen(false)}
              className="flex-1 py-2 rounded-lg border border-gold/20 text-foreground/70 hover:bg-gold/5 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateModuloSubmit}
              disabled={!moduloTitleInput.trim()}
              className="flex-1 py-2 rounded-lg bg-gold text-foreground font-semibold text-sm hover:bg-gold-dim disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
            >
              Criar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAulaModalOpen}
        onClose={() => setIsAulaModalOpen(false)}
        title="Nova Aula"
        description="Crie uma nova aula neste módulo."
      >
        <div className="space-y-4 pt-2">
          <input
            type="text"
            placeholder="Título da aula"
            value={aulaTitleInput}
            onChange={e => setAulaTitleInput(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-gold/20 text-foreground focus:border-gold outline-none text-sm"
            onKeyDown={e => e.key === 'Enter' && handleCreateAulaSubmit()}
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsAulaModalOpen(false)}
              className="flex-1 py-2 rounded-lg border border-gold/20 text-foreground/70 hover:bg-gold/5 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateAulaSubmit}
              disabled={!aulaTitleInput.trim()}
              className="flex-1 py-2 rounded-lg bg-gold text-foreground font-semibold text-sm hover:bg-gold-dim disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
            >
              Criar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ModuloCard({
  modulo,
  index,
  cursoId,
  onUpdate,
  onDelete,
  onCreateAula,
  onUpdateAula,
  onDeleteAula,
}: {
  modulo: ModuloComAulas;
  index: number;
  cursoId: string;
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onCreateAula: (module_id: string) => void;
  onUpdateAula: (id: string, data: Partial<Aula>) => void;
  onDeleteAula: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(modulo.title);
  const [expanded, setExpanded] = useState(true);

  const handleSaveModulo = () => {
    if (editTitle.trim()) {
      onUpdate(modulo.id, editTitle.trim());
      setEditing(false);
    }
  };

  const handleSaveAula = (aula: Aula, data: Partial<Aula>) => {
    onUpdateAula(aula.id, data);
  };

  return (
    <div className="bg-card-bg border border-gold/20 rounded-xl overflow-hidden">
      {/* Cabeçalho do Módulo */}
      <div className="bg-background/50 p-4 flex items-center justify-between border-b border-gold/10">
        <div className="flex items-center gap-3">
          <GripVertical size={18} className="text-foreground/30 cursor-grab active:cursor-grabbing" />
          {editing ? (
            <>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveModulo()}
                onBlur={handleSaveModulo}
                autoFocus
                className="bg-background border border-gold px-2 py-1 rounded text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button onClick={handleSaveModulo} className="p-1.5 text-green-500 hover:text-green-400"><Edit2 size={16} /></button>
            </>
          ) : (
            <h3 className="font-bold text-foreground" onDoubleClick={() => setEditing(true)}>
              Módulo {index + 1}: {modulo.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 text-foreground/50 hover:text-gold transition-colors"
            onClick={() => setEditing(!editing)}
            title={editing ? 'Cancelar' : 'Editar'}
          >
            <Edit2 size={16} />
          </button>
          <button
            className="p-1.5 text-foreground/50 hover:text-red-500 transition-colors"
            onClick={() => onDelete(modulo.id)}
            title="Excluir módulo e todas as aulas"
          >
            <Trash2 size={16} />
          </button>
          <button
            className="p-1.5 text-foreground/50 hover:text-gold transition-colors ml-2"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Recolher' : 'Expandir'}
          >
            <GripVertical size={16} className={expanded ? 'rotate-90' : ''} />
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Lista de Aulas */}
          <div className="p-2 space-y-1">
            {modulo.aulas.map((aula, aIndex) => (
              <AulaCard
                key={aula.id}
                aula={aula}
                index={aIndex}
                onUpdate={handleSaveAula}
                onDelete={onDeleteAula}
              />
            ))}

            <button
              onClick={() => onCreateAula(modulo.id)}
              className="w-full mt-2 py-3 border border-dashed border-gold/20 rounded-lg text-sm font-medium text-foreground/50 hover:text-gold hover:border-gold/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Adicionar Aula
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AulaCard({
  aula,
  index,
  onUpdate,
  onDelete,
}: {
  aula: Aula;
  index: number;
  onUpdate: (aula: Aula, data: Partial<Aula>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editData, setEditData] = useState({
    title: aula.title,
    video_url: aula.video_url,
    duration_minutes: aula.duration_minutes,
  });

  const handleSave = () => {
    onUpdate(aula, editData);
    setEditing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Criar o registro do vídeo no Bunny através da nossa API segura
      const res = await fetch('/api/admin-academy/bunny/create-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editData.title || aula.title })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Falha ao iniciar upload');
      }

      const { guid, libraryId, apiKey } = await res.json();

      // 2. Fazer o upload do binário direto pro BunnyCDN via XMLHttpRequest para ter barra de progresso
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`, true);
        xhr.setRequestHeader('AccessKey', apiKey);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setEditData(prev => ({ ...prev, video_url: guid }));
            resolve(true);
          } else {
            reject(new Error('Falha no envio para o BunnyCDN'));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Erro de rede durante o upload'));
        };

        xhr.send(file);
      });

    } catch (err: any) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="group flex items-center justify-between p-3 rounded-lg hover:bg-foreground/5 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-6 h-6 rounded-full bg-gold/10 text-gold flex items-center justify-center text-xs font-bold shrink-0">
          {index + 1}
        </div>
        {editing ? (
          <div className="flex-1 space-y-2 min-w-0">
            <input
              type="text"
              value={editData.title}
              onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
              className="w-full bg-background border border-gold px-2 py-1 rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="ID do vídeo no Bunny.net (ou URL Vimeo/MP4)"
                value={editData.video_url}
                onChange={e => setEditData(prev => ({ ...prev, video_url: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="flex-1 bg-background border border-gold/20 px-2 py-1 rounded text-sm text-foreground focus:border-gold outline-none"
                disabled={uploading}
              />
              
              <label className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${uploading ? 'bg-gold/20 text-gold cursor-not-allowed' : 'bg-gold text-foreground hover:bg-gold-dim'}`}>
                {uploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={14} />
                    <span>Subir Vídeo</span>
                    <input type="file" accept="video/mp4,video/mov,video/avi" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </>
                )}
              </label>

              <input
                type="number"
                placeholder="Min"
                min="0"
                value={editData.duration_minutes}
                onChange={e => setEditData(prev => ({ ...prev, duration_minutes: Number(e.target.value) || 0 }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-16 bg-background border border-gold/20 px-2 py-1 rounded text-sm text-foreground focus:border-gold outline-none"
                disabled={uploading}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{aula.title}</p>
              <p className="text-[11px] text-foreground/50">{aula.duration_minutes} min</p>
            </div>
            {aula.video_url && (
              <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full font-medium">Vídeo</span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <button
            className="p-1.5 text-green-500 hover:text-green-600 transition-colors"
            onClick={handleSave}
            title="Salvar Alterações"
          >
            <Save size={14} />
          </button>
        ) : (
          <button
            className="p-1.5 text-foreground/50 hover:text-gold transition-colors"
            onClick={() => setEditing(true)}
            title="Editar"
          >
            <Edit2 size={14} />
          </button>
        )}
        <button
          className="p-1.5 text-foreground/50 hover:text-gold transition-colors"
          title="Materiais Anexos"
        >
          <FileText size={14} />
        </button>
        <button
          className="p-1.5 text-foreground/50 hover:text-red-500 transition-colors"
          onClick={() => onDelete(aula.id)}
          title="Excluir"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}