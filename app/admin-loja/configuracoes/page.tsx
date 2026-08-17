'use client';

import { useState, useEffect } from 'react';
import { Save, ShieldCheck, Truck, CreditCard } from 'lucide-react';

const CONFIG_STORAGE_KEY = 'loja-config';

interface LojaConfig {
  mpAccessToken: string;
  melhorEnvioToken: string;
  cepOrigem: string;
  prazoManuseio: string;
}

const defaultConfig: LojaConfig = {
  mpAccessToken: '',
  melhorEnvioToken: '',
  cepOrigem: '',
  prazoManuseio: '1',
};

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
              <label className="block text-sm font-medium text-slate-700 mb-1">Access Token (Produção) *</label>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="APP_USR-..." 
                  className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  value={config.mpAccessToken}
                  onChange={(e) => setConfig({ ...config, mpAccessToken: e.target.value })}
                />
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Sua chave privada. Nunca compartilhe este token publicamente.</p>
            </div>
            <div className="pt-2 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Save size={16} />
                <span>{saving ? 'Salvando...' : 'Salvar Credenciais'}</span>
              </button>
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
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Token de Acesso *</label>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="eyJ0e..." 
                  className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                  value={config.melhorEnvioToken}
                  onChange={(e) => setConfig({ ...config, melhorEnvioToken: e.target.value })}
                />
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
                <span>{saving ? 'Salvando...' : 'Salvar Credenciais'}</span>
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
