'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/Button';

interface Schedule {
  id: string;
  course_id: string;
  date: string;
  time: string;
  location: string;
  available_spots: number;
  is_active: boolean;
  course: { id: string; title: string };
}

interface CursoVIP {
  id: string;
  title: string;
}

export default function AdminAgendaVipPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [cursos, setCursos] = useState<CursoVIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [newSchedule, setNewSchedule] = useState({
    course_id: '',
    date: '',
    time: '',
    location: '',
    available_spots: 10
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [schedRes, cursosRes] = await Promise.all([
        fetch('/api/admin-academy/agenda-vip'),
        fetch('/api/admin-academy/cursos-vip')
      ]);
      
      if (schedRes.ok) setSchedules(await schedRes.json());
      if (cursosRes.ok) setCursos(await cursosRes.json());
      
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.date) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin-academy/agenda-vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule),
      });
      if (res.ok) {
        carregarDados();
        setNewSchedule({
          course_id: newSchedule.course_id, // keep selected
          date: '',
          time: '',
          location: '',
          available_spots: 10
        });
      } else {
        alert('Erro ao criar agendamento');
      }
    } catch (err) {
      alert('Erro de conexão');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta data?')) return;
    try {
      const res = await fetch(`/api/admin-academy/agenda-vip/${id}`, { method: 'DELETE' });
      if (res.ok) carregarDados();
    } catch (err) {
      alert('Erro ao excluir');
    }
  };

  if (loading) {
    return <div className="flex-1 p-6 text-foreground/50"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Agenda VIP</h1>
        <p className="text-sm text-foreground/60">Gerencie as datas e turmas dos seus cursos presenciais.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleCreate} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4">
            <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-gold" /> Nova Data
            </h2>

            {/* Curso VIP removido - as datas são universais para qualquer curso VIP */}
            
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Data Livre</label>
              <input
                type="date"
                required
                value={newSchedule.date}
                onChange={e => setNewSchedule({...newSchedule, date: e.target.value})}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 px-3 text-foreground focus:border-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Horário (ex: 09:00 às 18:00)</label>
              <input
                type="text"
                value={newSchedule.time}
                onChange={e => setNewSchedule({...newSchedule, time: e.target.value})}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 px-3 text-foreground focus:border-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Formato</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input 
                    type="radio" 
                    name="formato" 
                    value="GRUPO" 
                    checked={newSchedule.available_spots > 1}
                    onChange={() => setNewSchedule({...newSchedule, available_spots: 10})}
                    className="accent-gold"
                  />
                  Turma em Grupo
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input 
                    type="radio" 
                    name="formato" 
                    value="VIP" 
                    checked={newSchedule.available_spots === 1}
                    onChange={() => setNewSchedule({...newSchedule, available_spots: 1})}
                    className="accent-gold"
                  />
                  VIP Individual
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Local / Cidade</label>
              <input
                type="text"
                value={newSchedule.location}
                onChange={e => setNewSchedule({...newSchedule, location: e.target.value})}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 px-3 text-foreground focus:border-gold outline-none"
                placeholder="Ex: Telêmaco Borba, São Paulo, etc."
              />
            </div>

            {newSchedule.available_spots > 1 && (
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Vagas Totais</label>
                <input
                  type="number"
                  min="2"
                  value={newSchedule.available_spots}
                  onChange={e => setNewSchedule({...newSchedule, available_spots: parseInt(e.target.value) || 2})}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 px-3 text-foreground focus:border-gold outline-none"
                />
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full flex justify-center gap-2" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Adicionar Data
            </Button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--background)]">
                  <th className="p-4 text-sm font-semibold text-foreground/70">Data / Horário</th>
                  <th className="p-4 text-sm font-semibold text-foreground/70">Local</th>
                  <th className="p-4 text-sm font-semibold text-foreground/70 w-32">Formato / Vagas</th>
                  <th className="p-4 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(schedule => (
                  <tr key={schedule.id} className="border-b border-[var(--border-subtle)]/50 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-foreground/80">
                      <div>{new Date(schedule.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                      <div className="text-xs text-foreground/50">{schedule.time}</div>
                    </td>
                    <td className="p-4 text-sm text-foreground/80">
                      {schedule.location || '-'}
                    </td>
                    <td className="p-4 text-sm text-foreground/80">
                      {schedule.available_spots === 1 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-gold/20 text-gold text-xs font-bold">VIP Individual</span>
                      ) : (
                        `${schedule.available_spots} Vagas`
                      )}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleDelete(schedule.id)}
                        className="p-2 text-foreground/50 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-foreground/50">
                      Nenhuma data agendada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
