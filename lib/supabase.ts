/**
 * Mock Supabase client — placeholder até conectar ao backend real.
 * Retorna um objeto compatível com a API do @supabase/supabase-js
 * para que as páginas de admin não quebrem em dev.
 */

type MockResponse<T = unknown> = {
  data: T | null;
  error: { message: string } | null;
};

type MockQueryBuilder = {
  select: (columns?: string) => MockQueryBuilder;
  insert: (values: unknown) => MockQueryBuilder;
  update: (values: unknown) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  eq: (column: string, value: unknown) => MockQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => Promise<MockResponse>;
  single: () => Promise<MockResponse>;
  then: (resolve: (value: MockResponse) => void) => void;
};

function createMockQueryBuilder(): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    order: async () => ({ data: [], error: null }),
    single: async () => ({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
  };
  return builder;
}

const mockClient = {
  from: (_table: string) => createMockQueryBuilder(),
  auth: {
    signUp: async (_credentials: { email: string; password: string }) => ({
      data: null,
      error: { message: 'Supabase não configurado. Use mock data.' },
    }),
    signInWithPassword: async (_credentials: { email: string; password: string }) => ({
      data: null,
      error: { message: 'Supabase não configurado. Use mock data.' },
    }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
  },
};

/** Retorna o mock client. Quando Supabase for configurado, substitua por createClient(). */
export function supabase() {
  return mockClient;
}

export default mockClient;
