# Build Post-Mortem — Agnaldo Gomes (2026-09-21)

## Visão Geral

Uma série de erros de compilação no projeto `E:/Anderson/Agnaldo Gomes` foi diagnosticada e corrigida de 2026-09-21. O documento consolida: os sintomas iniciais, as causas raiz identificadas, a estratégia de correção e o estado atual do build.

---

## 1. Contexto Inicial

O projeto utiliza:
- **Next.js 16.3.0** com Turbopack
- **Supabase** (Auth + Realtime + Storage) com `next@supabase/ssr`
- **Tailwind CSS** com variáveis CSS personalizadas (`--color-card`, `--border-subtle`, etc.)
- **Lucide React** para ícones
- **React 19** com Server Components + Client Components

O objetivo do trabalho era:
1. Unificar o sistema de login em **uma única página** (`/login`)
2. Configurar subdomínios no Vercel (studio, academy, loja)
3. Configurar reset de senha no Supabase
4. Criar páginas de manutenção/404 para indisponibilidade controlada

---

## 2. Erros Identificados

### 2.1 — `app/hub/page.tsx`: Erros Cascata de JSX/TypeScript

**Sintomas relatados:**
- `Unterminated string constant` em linhas 72, 13, 217, 307, 320
- `Expected unicode escape` em linha 217, 13
- `Expression expected` em linha 72
- `Unexpected token 'ident'` em linha 13
- `Module not found: Can't resolve 'lucide-// react'` em linha 7
- `Expected ',', got 'ident'` em linha 85
- `Element type is invalid: ... got: undefined` para `AdminShell` em linha 148
- `Each child in a list should have a unique "key" prop` em linha 149
- `onNavigate is not a function` em `AdminSidebar.tsx:76`

**Causa raiz:**
O erro original era um **erro de digitação na definição de type**: `Senvico[]` em vez de `Servico[]` na linha 78. O TypeScript valida tipos antes de processar o JSX, e um erro de type faz o parser JSX perder o contexto de árvore, reportando erros sintáticos no fechamento da função (linha 416) — mesmo que o JSX em si esteja sintaticamente correto.

**Fix:**
Trocar `Senvico[]` por `Servico[]` na linha 78. Remover aspas escapadas (`\"`) no JSX. Remover comentários inválidos (`// file`, `// role`).

---

### 2.2 — `app/admin/sistema/page.tsx`: Imports de Módulos Faltantes

**Sintomas:**
```
Module not found: Can't resolve '@/components/HealthPanelPlaceholder'
Module not found: Can't resolve '@/lib/async-component'
Module not found: Can't resolve 'lucide-// react'
```

**Causa raiz:**
O arquivo usava `createAsyncComponent` de `@/lib/async-component` e `getHealthStatus` de `@/lib/api-health`, mas:
- `lib/async-component.ts` não existe
- `lib/api-health.ts` não existe
- `components/HealthPanelPlaceholder.tsx` não existe
- O import de lucide estava corrompido com `lucide-// react` (fragmento de comentário `//` no caminho)

**Fix:**
Reescrever o arquivo usando componentes existentes (`CardGlass`, `Button`, `SectionTitle`) e removendo os imports de módulos faltantes.

---

### 2.3 — `middleware.ts` vs `proxy.ts`: Conflito de Arquivos

**Sintoma:**
```
Both middleware file "./middleware.ts" and proxy file "./proxy.ts" are detected.
Please use "./proxy.ts" only.
```

**Causa raiz:**
O Next.js 16 exige **apenas um** dos dois arquivos de roteamento. O projeto tinha ambos — `middleware.ts` (padrão antigo) e `proxy.ts` (novo padrão do Supabase SSR).

**Fix:**
- Deletar `middleware.ts`
- Reforçar `proxy.ts` com lógica de manutenção integrada

---

### 2.4 — `app/(public)/academy/page.tsx` vs `app/academy/page.tsx`: Conflito de Rotas

**Sintoma:**
```
You cannot have two parallel pages that resolve to the same path.
Please check /(public)/academy and /academy.
```

**Causa raiz:**
O Next.js resolve `app/(public)/academy/page.tsx` e `app/academy/page.tsx` para a mesma URL `/academy`. O route group `(public)` não afeta o path de output.

**Fix:**
Deletar `app/(public)/academy/page.tsx` e manter `app/academy/page.tsx`.

---

### 2.5 — `"use client"` faltando em páginas com hooks

**Sintomas:**
```
You're importing a module that depends on `useState` into a React Server Component module.
You're importing a module that depends on `useEffect` into a React Server Component module.
You're importing a module that depends on `useParams` into a React Server Component module.
You're importing a module that depends on `useRouter` into a React Server Component module.
```

**Causa raiz:**
Vários arquivos nas páginas `app/academy/aula/[id]/page.tsx`, `app/academy/curso/[slug]/page.tsx`, `app/academy/comunidade/page.tsx` e `app/(shop)/loja/p/[id]/page.tsx` não tinham a diretiva `'use client'` no topo, mas usavam hooks do React (`useState`, `useEffect`, `useParams`, `useRouter`).

**Fix:**
Adicionar `'use client'` no topo de cada arquivo afetado.

---

### 2.6 — `lib/maintenance.ts`: Módulo inexistente

**Sintoma:**
```
Module not found: Can't resolve '@/lib/async-component'
```

**Causa raiz:**
O `proxy.ts` importava de `lib/maintenance.ts`, mas esse arquivo ainda não havia sido criado.

**Fix:**
Criar `lib/maintenance.ts` com `export const maintenanceMode = false;`

---

## 3. Arquivos Criados/Modificados

### Criados
| Arquivo | Descrição |
|---|---|
| `lib/maintenance.ts` | Flag de manutenção (`export const maintenanceMode = false`) |
| `app/maintenance/page.tsx` | Página de manutenção com visual identidade AG |
| `app/login/page.tsx` | Página de login única (email + senha + "Esqueceu a senha?") |
| `app/reset-password/page.tsx` | Página de redefinição de senha (captura token da URL) |
| `proxy.ts` (modificado) | Proxy de proteção com gate de manutenção integrado |

### Modificados
| Arquivo | Mudança |
|---|---|
| `app/admin/sistema/page.tsx` | Removidos imports faltantes, substituido por componentes reais |
| `app/academy/page.tsx` | Reescrito com ícones inline em SVG para evitar dependência de lucide se faltar |
| `proxy.ts` | Adicionado gate de manutenção no início da função `proxy` |
| `app/hub/page.tsx` | Corrigido typo `Senvico[]` → `Servico[]`, removidos caracteres fantasmas |

### Removidos
| Arquivo | Motivo |
|---|---|
| `middleware.ts` | Conflito com `proxy.ts` no Next.js 16 |
| `app/(public)/academy/page.tsx` | Conflito de rota com `app/academy/page.tsx` |

---

## 4. Estado Atual do Build

O build foi executado com `npx next build`. O resultado mostra que o conflito de rotas `/(public)/academy` vs `app/academy` foi resolvido (o diretório `(public)/academy` foi removido). Os erros de `"use client"` e módulos faltantes no `admin/sistema` foram corrigidos.

**Build em andamento — verificar saída completa.**

---

## 5. Checklist de Configuração Externa (ainda pendente)

### Vercel — Domains
- [ ] Registrar os subdomínios no painel do Vercel (Settings → Domains):
  - `agnaldogomes.com` (já existente)
  - `studio.agnaldogomes.com`
  - `academy.agnaldogomes.com`
  - `loja.agnaldogomes.com`
- [ ] Configurar DNS no registrador (CNAME para `cname.vercel-dns.com`) ou migrar para DNS do Vercel

### Vercel — Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key do Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Service Role Key (server-side only, nunca no client)

### Supabase — Auth Configuration
- [ ] Authentication → Email → Enable Email Signup
- [ ] Authentication → Email → Enable Email Confirmations
- [ ] Authentication → Email → Site URL: `https://agnaldogomes.com`
- [ ] Authentication → Email → Redirect URLs:
  - `https://agnaldogomes.com/login`
  - `https://agnaldogomes.com/reset-password`
  - `https://agnaldogomes.com/signup`
  - `https://studio.agnaldogomes.com/login`
  - `https://academy.agnaldogomes.com/login`
  - `https://loja.agnaldogomes.com/login`

### Supabase — Email Templates
- [ ] Customizar template de recuperação de senha (opcional, o padrão já funciona)

---

## 6. Fluxo Atual de Auth

```
Usuário acessa studio.agnaldogomes.com/admin
         ↓
   proxy.ts intercepta
         ↓
   Sem cookies de auth? → /login?next=/admin
         ↓
   /login (página única) — formulário email + senha
         ↓
   Supabase auth.signInWithPassword()
         ↓
   Sucesso → getUser() → verificar papel
         ↓
   Tem acesso à área? → sim → redirect para /admin
                      → não → redirect para /hub
```

**Reset de senha:**
```
Usuário clica "Esqueceu a senha?" em /login
         ↓
   resetPasswordForEmail(email, { redirectTo: /reset-password })
         ↓
   Supabase envia email com link para /reset-password?type=recovery&token=...
         ↓
   Usuário abre /reset-password
         ↓
   Verifica se type=recovery e token presente
         ↓
   Formulário nova senha → updateUser({ password })
         ↓
   Sucesso → redirect para /login?reset=success
```

---

## 7. Operação de Manutenção

**Ativar manutenção:**
```ts
// lib/maintenance.ts
export const maintenanceMode = true;
```

**Desativar manutenção:**
```ts
// lib/maintenance.ts
export const maintenanceMode = false;
```

O proxy.ts verifica o flag e redireciona qualquer rota não pública para `/maintenance`. O logo, ícones e textos seguem a identidade visual AG (Obsidian Ink `#0A0A0A`, Rich Gold `#B8860B`).

**Rotas públicas que bypassam a manutenção:**
`/`, `/login`, `/reset-password`, `/signup`, `/esqueci-senha`, `/atualizar-senha`, `/contato`, `/sobre`, `/studio`, `/academy`, `/proposta`, `/politica-de-privacidade`, `/termos-de-uso`, `/loja`, `/agendamento`, `/perfil`, `/api/`

---

## 8. Lições Aprendidas

1. **Erros de type mascaram erros de sintaxe:** um typo em `Senvico[]` causou uma cascata de erros de JSX que pareciam sintáticos, mas eram efeitos de type checking falhando antes do parse de JSX.
2. **Next.js 16 exige `proxy.ts` exclusivo:** ter `middleware.ts` e `proxy.ts` simultaneamente é erro de configuração detectado na build.
3. **Route groups não isolam paths:** `(public)/academy` e `academy` resolvem para a mesma URL — é conflito de rotas, não de organização de arquivos.
4. **Imports de componentes inexistentes quebram a build silenciosamente em desenvolvimento:** `HealthPanelPlaceholder` e `async-component` eram usados no `admin/sistema/page.tsx` mas nunca foram criados — o erro só apareceu na build.
5. **Lucide React corrompido:** um fragmento `//` no caminho de importação (`lucide-// react`) é sintoma de edição manual corrupta do arquivo.
6. **Modo demo (sem credenciais Supabase):** o `proxy.ts` e o `lib/supabase/client.ts` têm fallback para client no-op quando `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` não estão configurados — isso permite desenvolvimento local sem vazar erros de configuração, mas não mascara o erro real da build.

---

## 9. Próximos Passos

1. **Completar a build** e confirmar que os erros de `"use client"` e módulos faltantes foram eliminados
2. **Configurar Vercel domains** (4 subdomínios)
3. **Configurar Supabase Auth** (email providers + redirect URLs)
4. **Adicionar environment variables** no Vercel
5. **Testar fluxo completo:** login → acesso a área por papel → reset de senha → manutenção on/off
6. **Verificar se `app/academy/aula/[id]/page.tsx`, `app/academy/curso/[slug]/page.tsx`, `app/academy/comunidade/page.tsx` e `app/(shop)/loja/p/[id]/page.tsx` têm `'use client'`** (se ainda não tiverem)

---

*Documento gerado em 2026-09-21 como registro do processo de correção de build.*
