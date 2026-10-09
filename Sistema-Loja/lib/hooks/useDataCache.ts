'use client';

/**
 * useDataCache — Hook Stale-While-Revalidate para dados de API
 *
 * Serve dados do localStorage instantaneamente e revalida em background.
 * Ideal para dados que mudam com pouca frequência (serviços, profissionais, produtos).
 *
 * @param key     Chave única no localStorage (ex: 'services-list')
 * @param fetcher Função async que busca os dados na API
 * @param options Opções de TTL e comportamento
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheOptions {
  /** Tempo de vida do cache em milissegundos (padrão: 5 minutos) */
  ttl?: number;
  /** Revalidar automaticamente ao recuperar foco da janela? */
  revalidateOnFocus?: boolean;
  /** Revalidar quando a conexão volta? */
  revalidateOnReconnect?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseDataCacheResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  refresh: () => void;
}

const CACHE_PREFIX = 'ag-cache:';

function readCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage pode estar cheio; ignorar silenciosamente
  }
}

export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): UseDataCacheResult<T> {
  const {
    ttl = 5 * 60 * 1000,          // 5 minutos
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const isFetching = useRef(false);

  const fetch = useCallback(async (background = false) => {
    if (isFetching.current) return;
    isFetching.current = true;

    if (!background) setLoading(true);
    setError(null);

    try {
      const freshData = await fetcher();
      writeCache(key, freshData);
      setData(freshData);
      setIsStale(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados';
      if (!background) {
        // Se falhar em background, mantém dados do cache
        setError(msg);
      }
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [key, fetcher]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar dados na inicialização
  useEffect(() => {
    const cached = readCache<T>(key);

    if (cached) {
      setData(cached.data);
      setLoading(false);

      const age = Date.now() - cached.timestamp;
      if (age > ttl) {
        // Cache expirado: marcar como stale e revalidar em background
        setIsStale(true);
        fetch(true);
      }
    } else {
      // Sem cache: buscar diretamente
      fetch(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revalidar ao recuperar foco
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const handler = () => {
      const cached = readCache<T>(key);
      if (!cached) return;
      const age = Date.now() - cached.timestamp;
      if (age > ttl) fetch(true);
    };

    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [key, ttl, revalidateOnFocus, fetch]);

  // Revalidar quando conexão volta
  useEffect(() => {
    if (!revalidateOnReconnect) return;

    const handler = () => fetch(true);
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [revalidateOnReconnect, fetch]);

  return { data, loading, error, isStale, refresh: () => fetch(false) };
}

// Limpar entradas expiradas do cache
export function cleanExpiredCache(ttl = 60 * 60 * 1000): void {
  try {
    const now = Date.now();
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => {
        try {
          const entry = JSON.parse(localStorage.getItem(k) || '{}');
          if (now - entry.timestamp > ttl) localStorage.removeItem(k);
        } catch {
          localStorage.removeItem(k);
        }
      });
  } catch {
    // Silently ignore
  }
}
