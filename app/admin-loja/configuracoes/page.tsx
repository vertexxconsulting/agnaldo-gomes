'use client';

import { useState, useEffect } from 'react';
import { Save, ShieldCheck, Truck, CreditCard, Gift } from 'lucide-react';
import { SectionHeader } from '@/components/ui/Panel';

const CONFIG_STORAGE_KEY = 'loja-config';

interface LojaConfig {
  mpAccessToken: string;
  melhorEnvioToken: string;
  cepOrigem: string;
  prazoManuseio: string;
  freteGratis: boolean;
  freteGratisAcimaDe: string;
  valorMotoboy: string;
  valorCorreios: string;
}

const defaultConfig: LojaConfig = {
  mpAccessToken: '',
  melhorEnvioToken: '',
  cepOrigem: '',
  prazoManuseio: '1',
  freteGratis: false,
  freteGratisAcimaDe: '',
  valorMotoboy: '15.00',
  valorCorreios: '28.50',
};

const inputCls = "w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors";

export default function AdminLojaConfiguracoes() {
  const [config, setConfig] = useState<LojaConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConfig({ ...defaultConfig, ...JSON.parse(saved) });
      } catch {
        // ignore parse error
      } 
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    setTimeout(() => setSaving(false), 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <SectionHeader
        eyebrow="Integrações e regras"
        title="Configurações da Loja"
      />

      <div className="space-y-6">
        
        {/* Integração Mercado Pago */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--background)] flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary border border-primary/25 rounded-xl flex items-center justify-center">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">Mercado Pago (Checkout)</h2>
              <p className="text-sm text-foreground/50">Gateway para processar os pagamentos dos produtos físicos.</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Access Token (Produção) *</label>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="APP_USR-..." 
                  className={`${inputCls} pl-10`} 
                  value={config.mpAccessToken}
                  onChange={(e) => setConfig({ ...config, mpAccessToken: e.target.value })}
                />
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
              </div>
              <p className="text-xs text-foreground/50 mt-1">Sua chave privada. Nunca compartilhe este token publicamente.</p>
            </div>
            <div className="pt-2 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 shadow-md"
              >
                <Save size={16} />
                <span>{saving ? 'Salvando...' : 'Salvar Credenciais'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Integração Melhor Envio */}
        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--background)] flex items-center gap-4">
            <div className="w-12 h-12 bg-success/10 text-success border border-success/25 rounded-xl flex items-center justify-center">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">Melhor Envio (Frete)</h2>
              <p className="text-sm text-foreground/50">Cálculo de frete e geração de etiquetas de envio.</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Token de Acesso *</label>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="eyJ0e..." 
                  className={`${inputCls} pl-10`} 
                  value={config.melhorEnvioToken}
                  onChange={(e) => setConfig({ ...config, melhorEnvioToken: e.target.value })}
                />
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
              </div>
            </div>
            
            {/* Regra de frete: grátis ou pago pelo cliente */}
            <div className="border border-primary/20 rounded-lg p-4 space-y-4 bg-primary/5">
              <div className="flex items-center gap-2">
                <Gift className="text-primary" size={16} />
                <h3 className="text-sm font-bold text-foreground">Regra de Frete</h3>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.freteGratis}
                  onChange={(e) => setConfig({ ...config, freteGratis: e.target.checked })}
                  className="w-4 h-4 mt-0.5 accent-primary"
                />
                <span className="text-sm text-foreground/80">
                  <b>Frete grátis para todos os pedidos</b> — a loja absorve o custo do envio (o cliente paga R$ 0 de frete).
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Frete grátis acima de (R$)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="Ex: 200 (deixe 0 para desativar)" 
                    className={inputCls} 
                    value={config.freteGratisAcimaDe}
                    onChange={(e) => setConfig({ ...config, freteGratisAcimaDe: e.target.value })}
                  />
                  <p className="text-xs text-foreground/50 mt-1">Acima deste valor o frete sai de graça; abaixo, o cliente paga.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Valores quando o frete é pago</label>
                  <div className="space-y-2">
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      placeholder="Motoboy (R$)" 
                      className={inputCls} 
                      value={config.valorMotoboy}
                      onChange={(e) => setConfig({ ...config, valorMotoboy: e.target.value })}
                    />
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      placeholder="Correios PAC (R$)" 
                      className={inputCls} 
                      value={config.valorCorreios}
                      onChange={(e) => setConfig({ ...config, valorCorreios: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-foreground/50 mt-1">Valores cobrados do cliente quando o frete não é grátis.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">CEP de Origem *</label>
                <input 
                  type="text" 
                  placeholder="00000-000" 
                  className={inputCls} 
                  value={config.cepOrigem}
                  onChange={(e) => setConfig({ ...config, cepOrigem: e.target.value })}
                />
                <p className="text-xs text-foreground/50 mt-1">O CEP do estúdio de onde os pacotes sairão.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Prazo de Manuseio (dias)</label>
                <input 
                  type="number" 
                  placeholder="Ex: 1" 
                  className={inputCls} 
                  value={config.prazoManuseio}
                  onChange={(e) => setConfig({ ...config, prazoManuseio: e.target.value })}
                />
                <p className="text-xs text-foreground/50 mt-1">Tempo necessário para você embalar e postar.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 shadow-md"
              >
                <Save size={16} />
                <span>{saving ? 'Salvando...' : 'Salvar Credenciais'}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-success text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          Configurações salvas com sucesso!
        </div>
      )}
    </div>
  );
}
