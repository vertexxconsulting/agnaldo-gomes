'use client';

import { useState, useEffect } from 'react';
import { Save, ShieldCheck, Truck, CreditCard, Gift } from 'lucide-react';

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

export default function AdminLojaConfiguracoes() {
  const [config, setConfig] = useState<LojaConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [envStatus, setEnvStatus] = useState({ mpConfigured: false, meConfigured: false });

  useEffect(() => {
    // Carrega dados do localStorage para as outras configs (frete, etc)
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch {
        // ignore parse error
      } 
    }

    // Carrega status das variáveis de ambiente da Vercel
    fetch('/api/admin/env-status')
      .then(res => res.json())
      .then(data => setEnvStatus(data))
      .catch(console.error);
  }, []);

  const handleSave = () => {
    setSaving(true);
    // Removemos os tokens do localStorage, já que estão na Vercel
    const configToSave = { ...config, mpAccessToken: '', melhorEnvioToken: '' };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configToSave));
    setTimeout(() => {
      setSaving(false);
      alert('Configurações salvas com sucesso!');
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações da Loja</h1>
        <p className="text-slate-500 mt-1">Gerencie as integrações de pagamento e frete do seu e-commerce.</p>
      </div>

      <div className="space-y-6">
        
        {/* Integração Mercado Pago */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mercado Pago (Checkout)</h2>
              <p className="text-sm text-slate-500">Gateway para processar os pagamentos dos produtos físicos.</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Access Token (Produção)</label>
              <div className="relative">
                <input 
                  type="password" 
                  disabled
                  placeholder={envStatus.mpConfigured ? "Token configurado na Vercel (••••••••)" : "Token não configurado"} 
                  className={`w-full border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none ${envStatus.mpConfigured ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`} 
                  value=""
                  readOnly
                />
                <ShieldCheck className={`absolute left-3 top-1/2 -translate-y-1/2 ${envStatus.mpConfigured ? 'text-green-500' : 'text-slate-400'}`} size={18} />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                As variáveis de ambiente estão configuradas para serem lidas diretamente da <strong>Vercel</strong> por motivos de segurança. 
                Configure a variável <code>MP_ACCESS_TOKEN</code> no painel da Vercel.
              </p>
            </div>
          </div>
        </div>

        {/* Integração Melhor Envio */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Melhor Envio (Frete)</h2>
              <p className="text-sm text-slate-500">Cálculo de frete e geração de etiquetas de envio.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Token de Acesso</label>
              <div className="relative">
                <input 
                  type="password" 
                  disabled
                  placeholder={envStatus.meConfigured ? "Token configurado na Vercel (••••••••)" : "Token não configurado"} 
                  className={`w-full border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none ${envStatus.meConfigured ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`} 
                  value=""
                  readOnly
                />
                <ShieldCheck className={`absolute left-3 top-1/2 -translate-y-1/2 ${envStatus.meConfigured ? 'text-green-500' : 'text-slate-400'}`} size={18} />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Configure a variável <code>MELHOR_ENVIO_TOKEN</code> no painel de Environment Variables da Vercel.
              </p>
            </div>
            
            {/* Regra de frete: grátis ou pago pelo cliente */}
            <div className="border border-amber-200 rounded-lg p-4 space-y-4 bg-amber-50/40">
              <div className="flex items-center gap-2">
                <Gift className="text-amber-600" size={16} />
                <h3 className="text-sm font-bold text-slate-900">Regra de Frete</h3>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.freteGratis}
                  onChange={(e) => setConfig({ ...config, freteGratis: e.target.checked })}
                  className="w-4 h-4 mt-0.5 accent-amber-500"
                />
                <span className="text-sm text-slate-700">
                  <b>Frete grátis para todos os pedidos</b> — a loja absorve o custo do envio (o cliente paga R$ 0 de frete).
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Frete grátis acima de (R$)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="Ex: 200 (deixe 0 para desativar)" 
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                    value={config.freteGratisAcimaDe}
                    onChange={(e) => setConfig({ ...config, freteGratisAcimaDe: e.target.value })}
                  />
                  <p className="text-xs text-slate-500 mt-1">Acima deste valor o frete sai de graça; abaixo, o cliente paga.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valores quando o frete é pago</label>
                  <div className="space-y-2">
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      placeholder="Motoboy (R$)" 
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                      value={config.valorMotoboy}
                      onChange={(e) => setConfig({ ...config, valorMotoboy: e.target.value })}
                    />
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      placeholder="Correios PAC (R$)" 
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                      value={config.valorCorreios}
                      onChange={(e) => setConfig({ ...config, valorCorreios: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Valores cobrados do cliente quando o frete não é grátis.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CEP de Origem *</label>
                <input 
                  type="text" 
                  placeholder="00000-000" 
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                  value={config.cepOrigem}
                  onChange={(e) => setConfig({ ...config, cepOrigem: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">O CEP do estúdio de onde os pacotes sairão.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prazo de Manuseio (dias)</label>
                <input 
                  type="number" 
                  placeholder="Ex: 1" 
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                  value={config.prazoManuseio}
                  onChange={(e) => setConfig({ ...config, prazoManuseio: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">Tempo necessário para você embalar e postar.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Save size={16} />
                <span>{saving ? 'Salvando...' : 'Salvar Configurações de Frete'}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          Configurações salvas com sucesso!
        </div>
      )}
    </div>
  );
}
