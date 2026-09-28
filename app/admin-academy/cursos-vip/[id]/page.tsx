'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Image as ImageIcon, Calendar, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { ImageUpload } from '@/components/ImageUpload';

interface CursoVIP {
  id: string;
  title: string;
  description: string;
  price: number;
  original_price: number;
  is_published: boolean;
  thumbnail_url: string;
  is_featured: boolean;
  format_text: string;
  certificate_included: boolean;
  content_topics: string[];
  investment_options: any[];
  stripe_payment_link?: string;
}

export default function AdminEdicaoCursoVipPage() {
  const params = useParams();
  const router = useRouter();
  const cursoId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cursoForm, setCursoForm] = useState<CursoVIP | null>(null);
  
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ success: boolean; paymentLink?: string; error?: string } | null>(null);

  const handleCreatePayment = async () => {
    if (!cursoForm?.price || cursoForm.price <= 0) {
      alert('Defina um preço maior que zero antes de gerar o link.');
      return;
    }
    
    setPaymentLoading(true);
    setPaymentResult(null);
    try {
      const res = await fetch(`/api/admin-academy/cursos-vip/${cursoId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: cursoForm.price }),
      });
      const data = await res.json();
      setPaymentResult(data);
      if (data.success && data.paymentLink) {
        setCursoForm({ ...cursoForm, stripe_payment_link: data.paymentLink });
      }
    } catch (err) {
      setPaymentResult({ success: false, error: 'Erro de conexão.' });
    }
    setPaymentLoading(false);
  };

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin-academy/cursos-vip/${cursoId}`);
      if (res.ok) {
        const data = await res.json();
        setCursoForm({
          ...data,
          content_topics: data.content_topics || [],
          investment_options: data.investment_options || [],
        });
      } else {
        router.push('/admin-academy/cursos-vip');
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
    setLoading(false);
  }, [cursoId, router]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleSaveDetalhes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoForm) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin-academy/cursos-vip/${cursoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cursoForm),
      });

      if (res.ok) {
        alert('Curso VIP atualizado com sucesso!');
        carregarDados();
      } else {
        const err = await res.json();
        alert('Erro ao salvar: ' + (err.error || 'Desconhecido'));
      }
    } catch (err) {
      alert('Erro de conexão ao salvar.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex justify-center items-center h-full text-foreground/50">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  if (!cursoForm) return null;

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin-academy/cursos-vip">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-foreground/70 hover:text-foreground">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar Curso VIP</h1>
          <p className="text-sm text-foreground/60">{cursoForm.title}</p>
        </div>
        
        <div className="ml-auto">
          <Link href="/admin-academy/agenda-vip">
            <Button variant="outline" className="flex items-center gap-2 border-gold/30 text-gold hover:bg-gold/10">
              <Calendar size={18} />
              Gerenciar Agenda
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl">
        <form onSubmit={handleSaveDetalhes} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">Título do Curso VIP</label>
                <input
                  type="text"
                  required
                  value={cursoForm.title}
                  onChange={e => setCursoForm({...cursoForm, title: e.target.value})}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 px-3 text-foreground focus:border-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">Descrição / Detalhes</label>
                <textarea
                  rows={4}
                  value={cursoForm.description}
                  onChange={e => setCursoForm({...cursoForm, description: e.target.value})}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 px-3 text-foreground focus:border-gold outline-none"
                  placeholder="Descreva sobre o curso presencial..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cursoForm.price}
                    onChange={e => setCursoForm({...cursoForm, price: parseFloat(e.target.value)})}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 px-3 text-foreground focus:border-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">Preço Antigo (Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cursoForm.original_price}
                    onChange={e => setCursoForm({...cursoForm, original_price: parseFloat(e.target.value)})}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 px-3 text-foreground focus:border-gold outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">Formato (ex: Presencial 2 dias)</label>
                <input
                  type="text"
                  value={cursoForm.format_text}
                  onChange={e => setCursoForm({...cursoForm, format_text: e.target.value})}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 px-3 text-foreground focus:border-gold outline-none"
                  placeholder="Presencial 10h"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2 flex items-center gap-2">
                  <ImageIcon size={16} /> Capa do Curso
                </label>
                <ImageUpload 
                  value={cursoForm.thumbnail_url} 
                  onChange={(url) => setCursoForm({...cursoForm, thumbnail_url: url})} 
                  bucket="thumbnails" 
                  folder={`cursos-vip/${cursoId}`} 
                />
              </div>

              <div className="bg-[var(--background)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-4">
                <h3 className="font-medium text-foreground">Configurações Adicionais</h3>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cursoForm.is_published}
                    onChange={e => setCursoForm({...cursoForm, is_published: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-gold focus:ring-gold"
                  />
                  <span className="text-sm text-foreground/80">Curso Publicado (Visível no site)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cursoForm.is_featured}
                    onChange={e => setCursoForm({...cursoForm, is_featured: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-gold focus:ring-gold"
                  />
                  <span className="text-sm text-foreground/80">Destaque na Home</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cursoForm.certificate_included}
                    onChange={e => setCursoForm({...cursoForm, certificate_included: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-gold focus:ring-gold"
                  />
                  <span className="text-sm text-foreground/80">Inclui Certificado</span>
                </label>
              </div>
              <div className="bg-[var(--background)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <CreditCard size={18} className="text-gold" />
                  Configuração de Pagamento Stripe
                </h3>
                
                <p className="text-xs text-foreground/60">
                  Crie um Stripe Price e Payment Link para este curso VIP.
                </p>

                {paymentResult?.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-red-500 leading-relaxed">{paymentResult.error}</span>
                  </div>
                )}

                {cursoForm.stripe_payment_link ? (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs font-medium text-green-400 mb-1 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Link Ativo
                    </p>
                    <code className="text-[10px] text-foreground/70 break-all">{cursoForm.stripe_payment_link}</code>
                  </div>
                ) : (
                  <div className="p-3 bg-gold/10 border border-gold/20 rounded-lg flex items-center gap-2">
                    <AlertTriangle size={14} className="text-gold shrink-0" />
                    <span className="text-xs text-foreground/60">Nenhum Link configurado ainda.</span>
                  </div>
                )}

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2 text-xs" 
                  onClick={handleCreatePayment}
                  disabled={paymentLoading || cursoForm.price <= 0}
                >
                  {paymentLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  Criar Stripe Price + Payment Link
                </Button>
              </div>

            </div>

          </div>

          <div className="pt-6 border-t border-[var(--border-subtle)] flex justify-end">
            <Button type="submit" variant="primary" className="flex items-center gap-2" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>

    </div>
  );
}
