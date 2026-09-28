import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  type: 'LOCAL_STOCK' | 'AFFILIATE_ML';
  stock_quantity?: number;
}

interface CartState {
  items: CartItem[];
  isHydrated: boolean;
  isLoading: boolean;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  hydrate: () => Promise<void>;
  getTotal: () => number;
  getItemCount: () => number;
}

const API_BASE = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_API_URL || '';

async function fetchCart() {
  const res = await fetch(`${API_BASE}/api/cart`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch cart');
  return res.json();
}

async function apiCall(method: string, body?: { productId?: string; quantity?: number }) {
  const res = await fetch(`${API_BASE}/api/cart`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro na requisição' }));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,
      isLoading: false,

      hydrate: async () => {
        if (get().isHydrated) return;
        set({ isLoading: true });
        try {
          const data = await fetchCart();
          set({ 
            items: data.items?.map((item: any) => ({
              id: item.products?.id || item.product_id,
              product_id: item.product_id,
              name: item.products?.name || item.name,
              price: Number(item.products?.price || item.unit_price),
              image_url: item.products?.image_url || item.image_url,
              quantity: item.quantity,
              type: item.products?.type || item.type,
              stock_quantity: item.products?.stock_quantity,
            })) || [],
            isHydrated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('[cartStore] Erro ao hidratar:', error);
          set({ isHydrated: true, isLoading: false });
        }
      },

      addItem: async (newItem) => {
        const quantity = newItem.quantity || 1;
        set({ isLoading: true });
        try {
          await apiCall('POST', { productId: newItem.product_id, quantity });
          // Re-hidratar para pegar dados atualizados do servidor
          await get().hydrate();
        } catch (error) {
          console.error('[cartStore] Erro ao adicionar:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (productId) => {
        set({ isLoading: true });
        try {
          await apiCall('DELETE', { productId });
          await get().hydrate();
        } catch (error) {
          console.error('[cartStore] Erro ao remover:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateQuantity: async (productId, quantity) => {
        set({ isLoading: true });
        try {
          await apiCall('PATCH', { productId, quantity });
          await get().hydrate();
        } catch (error) {
          console.error('[cartStore] Erro ao atualizar:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      clearCart: async () => {
        set({ isLoading: true });
        try {
          await apiCall('DELETE');
          set({ items: [] });
        } catch (error) {
          console.error('[cartStore] Erro ao limpar:', error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      getTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'ag-store-cart',
      partialize: (state) => ({ items: state.items }), // só persiste items localmente como fallback
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

// Auto-hidratar no client
if (typeof window !== 'undefined') {
  useCartStore.getState().hydrate();
}