'use client';

import { useMemo, useState } from 'react';
import { Box, CheckCircle2, ImageOff, RefreshCw, Search } from 'lucide-react';
import { normalizeShopImageUrl } from '@/lib/shop-utils';

export interface SalonInventoryResaleItem {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  unit?: string | null;
  stock_qty: number;
  sale_price?: number | null;
  allow_sale?: boolean;
  active?: boolean;
  image_url?: string | null;
  notes?: string | null;
}

interface SalonInventoryPickerProps {
  items: SalonInventoryResaleItem[];
  selectedId: string;
  loading?: boolean;
  onSelect: (item: SalonInventoryResaleItem | null) => void;
  onResync?: (item: SalonInventoryResaleItem) => void;
}

export function SalonInventoryPicker({
  items,
  selectedId,
  loading = false,
  onSelect,
  onResync,
}: SalonInventoryPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const sortedAndFiltered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(term) ||
            (i.brand && i.brand.toLowerCase().includes(term)) ||
            (i.category && i.category.toLowerCase().includes(term))
        )
      : items;

    return [...filtered].sort((a, b) => {
      const aHas = (a.stock_qty ?? 0) > 0 ? 1 : 0;
      const bHas = (b.stock_qty ?? 0) > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [items, searchTerm]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );

  const selectedImg = normalizeShopImageUrl(selectedItem?.image_url);

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Box size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Produto do Estoque do Salão (Revenda)
            </h2>
            <p className="text-xs text-slate-500">
              Selecione um item configurado para venda no estoque para integrar saldo, preço e foto.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md shrink-0">
          {items.length} {items.length === 1 ? 'item de revenda' : 'itens de revenda'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar produto por nome ou marca..."
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <select
          value={selectedId}
          disabled={loading}
          onChange={(e) => {
            const nextId = e.target.value;
            if (!nextId) {
              onSelect(null);
              return;
            }
            const found = items.find((i) => i.id === nextId) || null;
            onSelect(found);
          }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
        >
          <option value="">
            {loading
              ? 'Carregando produtos de revenda...'
              : '— Selecione um produto do estoque (ou cadastre avulso) —'}
          </option>
          {sortedAndFiltered.map((item) => {
            const qty = Math.floor(Number(item.stock_qty ?? 0));
            const priceText =
              item.sale_price != null && Number(item.sale_price) > 0
                ? ` • R$ ${Number(item.sale_price).toFixed(2).replace('.', ',')}`
                : '';
            const photoText = item.image_url ? ' • Com foto' : '';
            return (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.brand ? ` (${item.brand})` : ''} — Saldo: {qty} {item.unit || 'un'}
                {priceText}
                {photoText}
              </option>
            );
          })}
        </select>
      </div>

      {selectedItem && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-white border border-amber-200 flex items-center justify-center overflow-hidden shrink-0">
              {selectedImg ? (
                <img
                  src={selectedImg}
                  alt={selectedItem.name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <ImageOff size={18} className="text-slate-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span className="truncate">Vinculado: {selectedItem.name}</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Saldo no salão:{' '}
                <strong className={selectedItem.stock_qty > 0 ? 'text-emerald-700' : 'text-red-600'}>
                  {Math.floor(Number(selectedItem.stock_qty ?? 0))} {selectedItem.unit || 'un'}
                </strong>
                {selectedItem.sale_price != null && Number(selectedItem.sale_price) > 0 && (
                  <>
                    {' '}
                    • Preço cadastrado:{' '}
                    <strong>R$ {Number(selectedItem.sale_price).toFixed(2).replace('.', ',')}</strong>
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                As vendas da loja darão baixa automática neste item. Você pode alterar o nome de exibição abaixo sem alterar o estoque.
              </p>
            </div>
          </div>

          {onResync && (
            <button
              type="button"
              onClick={() => onResync(selectedItem)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              Puxar Foto e Preço do Estoque
            </button>
          )}
        </div>
      )}
    </div>
  );
}
