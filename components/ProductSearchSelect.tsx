'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Package, Beaker, ShoppingBag, ChevronDown } from 'lucide-react';

export interface ProductOption {
  id: string;
  name: string;
  brand?: string | null;
  unit?: string | null;
  stock_qty?: number | null;
  stock_quantity?: number | null;
  stock?: number | null;
  sale_price?: number | null;
  price?: number | null;
  price_per_gram?: number | null;
  cost_price?: number | null;
  category?: string | null;
  barcode?: string | null;
  allow_procedure_use?: boolean | null;
  allow_sale?: boolean | null;
  active?: boolean | null;
  [key: string]: any;
}

export interface ProductSearchSelectProps {
  products: ProductOption[];
  value: string;
  onChange: (productId: string, product?: ProductOption) => void;
  placeholder?: string;
  mode?: 'procedure' | 'sale' | 'auto';
  disabled?: boolean;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  required?: boolean;
  showStockBadge?: boolean;
}

/**
 * Remove acentos e normaliza para busca rápida (ex: "oleo" encontra "Óleo")
 */
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function ProductSearchSelect({
  products,
  value,
  onChange,
  placeholder = 'Digitar nome do produto para buscar...',
  mode = 'auto',
  disabled = false,
  className = '',
  id,
  autoFocus = false,
  showStockBadge = true,
}: ProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Produto atualmente selecionado
  const selectedProduct = useMemo(() => {
    if (!value) return null;
    return products.find(p => String(p.id) === String(value)) || null;
  }, [products, value]);

  // Lista filtrada em tempo real com base no texto digitado
  const filteredProducts = useMemo(() => {
    if (!query.trim()) return products;
    const cleanQuery = normalizeText(query);
    const words = cleanQuery.split(/\s+/).filter(Boolean);

    return products.filter(p => {
      const name = normalizeText(p.name);
      const brand = normalizeText(p.brand || '');
      const category = normalizeText(p.category || '');
      const barcode = normalizeText(p.barcode || '');
      const fullText = `${name} ${brand} ${category} ${barcode}`;

      // Todos os termos digitados devem estar presentes
      return words.every(w => fullText.includes(w));
    });
  }, [products, query]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rolagem automática ao navegar por teclado
  useEffect(() => {
    if (isOpen && listRef.current && listRef.current.children[highlightedIndex]) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (prod: ProductOption) => {
    onChange(prod.id, prod);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
    setQuery('');
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1 < filteredProducts.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Helper de cálculo de estoque e preços
  const getProductInfo = (p: ProductOption) => {
    const stock = p.stock_qty ?? p.stock_quantity ?? p.stock ?? 0;
    const unit = p.unit || 'un';

    // Preço de venda
    const salePrice = p.sale_price ?? p.price ?? 0;

    // Custo por grama/ml para insumos
    const pricePerGram = (p.price_per_gram && p.price_per_gram > 0)
      ? p.price_per_gram
      : ((p.cost_price && p.cost_price > 0) ? p.cost_price / 500 : 0.10);

    const isProcedure = mode === 'procedure' || (mode === 'auto' && (p.allow_procedure_use || !p.allow_sale));

    return {
      stock,
      unit,
      salePrice,
      pricePerGram,
      isProcedure,
    };
  };

  return (
    <div ref={containerRef} className={`relative w-full text-left ${className}`} id={id}>
      {/* Visual quando há um produto selecionado E dropdown está fechado */}
      {selectedProduct && !isOpen ? (
        <div 
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setQuery('');
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          className={`group flex items-center justify-between gap-2 p-2 bg-[var(--background)] border border-gold/40 hover:border-gold rounded-lg cursor-pointer transition-colors shadow-sm ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          title="Clique para pesquisar ou trocar de produto"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded bg-gold/15 text-gold flex items-center justify-center shrink-0">
              {mode === 'procedure' ? <Beaker size={13} /> : <ShoppingBag size={13} />}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-foreground truncate">
                  {selectedProduct.name}
                </span>
                {selectedProduct.brand && (
                  <span className="text-[10px] text-foreground/50">
                    ({selectedProduct.brand})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-foreground/60 mt-0.5">
                {showStockBadge && (
                  <span className="font-mono text-emerald-800 dark:text-emerald-400 font-semibold">
                    {getProductInfo(selectedProduct).stock} {getProductInfo(selectedProduct).unit} em estoque
                  </span>
                )}
                <span className="text-foreground/30">•</span>
                {mode === 'procedure' ? (
                  <span className="font-mono text-gold font-bold">
                    R$ {getProductInfo(selectedProduct).pricePerGram.toFixed(4)}/{getProductInfo(selectedProduct).unit}
                  </span>
                ) : (
                  <span className="font-mono text-gold font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getProductInfo(selectedProduct).salePrice)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={handleClear}
              className="p-1 rounded text-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Limpar seleção e buscar outro"
            >
              <X size={14} />
            </button>
            <ChevronDown size={14} className="text-foreground/40 group-hover:text-gold transition-colors" />
          </div>
        </div>
      ) : (
        /* Campo de Busca Interativo */
        <div className="relative">
          <div className={`flex items-center bg-[var(--background)] border ${
            isOpen ? 'border-gold ring-1 ring-gold/20' : 'border-[var(--border-subtle)]'
          } rounded-lg px-2.5 py-1.5 transition-all`}>
            <Search size={14} className="text-foreground/40 shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              disabled={disabled}
              autoFocus={autoFocus || isOpen}
              onChange={e => {
                setQuery(e.target.value);
                setHighlightedIndex(0);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={selectedProduct ? selectedProduct.name : placeholder}
              className="w-full bg-transparent text-xs text-foreground focus:outline-none placeholder:text-foreground/40 min-w-0"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setHighlightedIndex(0);
                  inputRef.current?.focus();
                }}
                className="p-1 text-foreground/40 hover:text-foreground shrink-0"
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            ) : (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setIsOpen(prev => !prev)}
                className="p-0.5 text-foreground/40 hover:text-foreground shrink-0"
              >
                <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-gold' : ''}`} />
              </button>
            )}
          </div>

          {/* Dropdown Flutuante de Produtos */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 backdrop-blur-md">
              <div ref={listRef} className="py-1">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((prod, idx) => {
                    const info = getProductInfo(prod);
                    const isSelected = selectedProduct?.id === prod.id;
                    const isHighlighted = highlightedIndex === idx;

                    return (
                      <div
                        key={prod.id}
                        onMouseDown={() => handleSelect(prod)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? 'bg-gold/20 text-gold font-bold'
                            : isHighlighted
                            ? 'bg-foreground/5 text-foreground'
                            : 'text-foreground/90 hover:bg-foreground/[0.03]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold truncate">
                              {prod.name}
                            </span>
                            {prod.brand && (
                              <span className="text-[10px] text-foreground/50">
                                ({prod.brand})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-foreground/60 mt-0.5">
                            {showStockBadge && (
                              <span className="font-mono text-emerald-800 dark:text-emerald-400 font-semibold">
                                {info.stock} {info.unit} em estoque
                              </span>
                            )}
                            <span className="text-foreground/30">•</span>
                            {mode === 'procedure' ? (
                              <span className="font-mono text-gold font-bold">
                                R$ {info.pricePerGram.toFixed(4)}/{info.unit}
                              </span>
                            ) : (
                              <span className="font-mono text-gold font-bold">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(info.salePrice)}
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <Check size={14} className="text-gold shrink-0" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center">
                    <Package size={24} className="mx-auto text-foreground/30 mb-1" />
                    <p className="text-xs text-foreground/60 font-semibold">
                      Nenhum produto encontrado para &quot;{query}&quot;
                    </p>
                    <p className="text-[10px] text-foreground/40 mt-0.5">
                      Tente buscar por parte do nome, marca ou código.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
