# Esqueleto — Repositórios Separados por Subsistema (Agnaldo Gomes)

Data: 2026-08-10
Objetivo: Isolar os sistemas em repos independentes para que uma alteração da IA que
quebre um sistema não derrube os outros (blast radius limitado a 1 repo + 1 deploy).
Decisão: Estratégia 1 — repos 100% auto-contidos, SEM pacote compartilhado (a duplicação
do tema é aceita e controlada via "acordo de paridade").

> Este documento é o BLUEPRINT. Ele não deve estar no repositório — fica na pasta docs/ (este monorepo atual) como referência.

---

## 1. Arquitetura final

| Repo | Subdomínio | Conteúdo |
|------|-----------|----------|
| `agnaldo-site` | `www.agnaldogomes.com.br` | Home, Sobre, Studio, Contato, Agendamento, Política/Termos |
| `agnaldo-academy` | `academy.agnaldogomes.com.br` | Login, Área do Aluno, Admin-Academy, Certificados, Cursos |
| `agnaldo-loja` | `loja.agnaldogomes.com.br` | Loja, Carrinho, Checkout, Admin-Loja, API checkout/ml-scraper |
| `agnaldo-admin` | `admin.agnaldogomes.com.br` | CRM (Agenda, Clientes, Profissionais, Serviços, Sistema) |

Vantagem sobre monorepo: git + build + deploy isolados em 3 camadas. IA não consegue contaminar outro repo.

---

## 2. Arquivos compartilhados (cópia idêntica em todos os repos)

Todos os repos usam ESTAS versões. Bloquer o `package.json` (versões fixas) e `globals.css`
(theme) para não haver drift. Qualquer mudança deliberada de tema deve ser replicada em
todos os repos (acordo de paridade — tratado na seção 5).

```
[em cada repo]
package.json            ← versão idêntica (abaixo)
next.config.ts          ← remotePatterns (mlstatic + unsplash)
tsconfig.json           ← idem
postcss.config.mjs      ← Tailwind v4
app/globals.css         ← @theme idêntico (abaixo)
app/layout.tsx          ← fontes Geist + ThemeProvider/class no <html>
lib/utils.ts            ← cn()
lib/animations.ts       ← EASE, fadeUp, fadeIn, scaleIn, staggerContainer
lib/supabase.ts         ← client mock (ou real, ver seção 6)
components/Button.tsx
components/CardGlass.tsx
components/SectionTitle.tsx
components/motion.tsx
components/ThemeToggle.tsx / ThemeLogo.tsx  (só onde há dark)
public/opt/*            ← logo-branca.webp, logo-hero.webp (assets de marca)
```

### 2.1 package.json (fixar versões — copie idêntico)
```json
{
  "name": "<repo>",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.112.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.43.0",
    "lucide-react": "^1.28.0",
    "mercadopago": "^3.3.0",
    "next": "16.3.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "recharts": "^3.10.1",
    "tailwind-merge": "^3.6.0",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.0",
    "tailwindcss": "^4",
    "typescript": "^5.8.0"
  }
}
```

### 2.2 next.config.ts (idêntico)
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'http2.mlstatic.com' },
    ],
  },
};

export default nextConfig;
```

### 2.3 app/globals.css (theme — copie idêntico)
Ver o arquivo atual em `app/globals.css`. Pontos a preservar:
- `@theme` com `--color-primary: #a8862a` (dourado), background `#faf8f3` (branco pérola)
- `.dark`, `.academy-dark`, utilitários `glass` e `text-gradient`
- Se um repo não usa dark (ex.: loja), pode podar `.dark`/`.academy-dark`, mas NÃO mude os tokens claros.

### 2.4 lib/utils.ts (idêntico)
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### 2.5 lib/animations.ts
Copiar de `lib/animations.ts` atual (EASE, fadeUp, fadeIn, scaleIn, staggerContainer, useAnimationPrefs, motion re-export).

---

## 3. Repo por subsistema — onde mora o código específico

Extrair do monorepo atual (raiz única hoje) para cada repo:

### 3.1 agnaldo-site → www
- app/(public)/ page · sobre · studio · contato · politica-de-privacidade · termos-de-uso · agendamento
- components/Header.tsx · Footer.tsx (versão site)
- public/ de marca/institucional
- Não tem loja, não tem academy, não tem admin.

### 3.2 agnaldo-academy → academy
- app/academy/login · app/aluno/... (catalogo, certificados, cursos, dashboard, perfil, tutorial, comunidade)
- app/admin-academy/... (alunos, certificados, comunidade, configuracoes, cursos, perfil, tutorial, layout)
- Usa `.academy-dark` (modo preto+dourado).

### 3.3 agnaldo-loja → loja
- app/(shop)/ los layout · loja (page, carrinho, checkout, p/[id])
- app/admin-loja/... (dashboard, produtos, produtos/novo, pedidos, configuracoes, layout)
- app/api/checkout/route.ts · app/api/ml-scraper/route.ts
- store/cartStore.ts · lib/mockProducts.ts (fonte única de produtos — use este, NÃO os mocks inline da vitrine/detalhe)
- public/opt/produto*.png

### 3.4 agnaldo-admin → admin
- app/admin/... (page, agenda, clientes, profissionais, servicos, loja, sistema, tutorial)
- app/admin/loja NÃO deve ir para cá se o admin-loja novo venceu — decidir (seção 4 do plano de ajuste).

---

## 4. AGENTS.md (fronteira anti-IA) — criar em CADA repo

Este é o arquivo que treina a IA a não procurar/tocar o que não existe. Copie e ajuste o escopo:

```md
# AGENTES — leia 100% antes de mexer

Este repo é APENAS <agnaldo-loja>.
NÃO existem aqui: academy, admin CRM, site institucional, agendamento.
Não procure rotas/exports desses sistemas. Se precisar deles, aponto o Anderson.

Escopo permitido:
- <lista de pastas, ex.: app/\(shop\), app/admin-loja, store, lib, app/api>
- só altere arquivos dentro deste escopo.

Fronteira block:
- <o que NUNCA tocar: app/globals.css @theme a menos que pedido; lib/supabase.ts a menos que pedido>

Verificação OBRIGATÓRIA antes de finalizar:
- npm run lint   (deve passar limpo — não deixe erro novo)
- npm run build  (deve concluir com sucesso)
- Não suba commit cujo build falhe. Se falhar, corrija ou avise.
```

---

## 5. Acordo de paridade (drive local — opcional, recomendado)
Para manter o tema sincronizado sem pacote compartilhado:
- Um dir `agnaldo-shared/` FORA dos repos (ex.: `C:\Anderson\agnaldo-shared`), contendo só os arquivos da seção 2 (theme + core).
- Ao mudar um tema, copiar de `agnaldo-shared` para os repos e commitar em cada um (ou 1 comando de sync com robocopy/rsync).
- Fica fora dos deploys — é só fonte de verdade local.

---

## 6. Vercel + Supabase
Por projeto (cada repo = 1 projeto):
1. Criar projeto Vercel importando o repo.
2. Domain → adicionar subdomínio (mapear para o subdomínio da tabela seção 1). Registrar NS vão no registrar do domínio.
3. Env vars por projeto:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou manter mock até pronto)
   - `MP_ACCESS_TOKEN` (só loja)
4. Supabase: pode ser o MESMO backend em todos (auth intra-repo é por-origin). Se quiser isolar dados, um projeto por subsistema.

Pendências ao ativar auth real (decisões):
- Carrinho/login são por-origin (`localStorage`/cookie). Não viajam entre subdomínios.
- Links entre subsistemas usam URL absoluta (https://academy.agnaldogomes.com.br/login).

---

## 7. Checklist de migração
1. [ ] `git init` + `.gitignore` (node_modules, .next, .env*) em cada repo.
2. [ ] Copiar shared (seção 2) para os 4 repos.
3. [ ] Mover pastas específicas (seção 3) — usar `git mv`/`mv` do monorepo atual.
4. [ ] Apontar import paths: `@/store`, `@/lib`, `@/components` (alias do tsconfig) — manter o alias `@/` igual nos 4.
5. [ ] Criar AGENTS.md (seção 4) em cada repo.
6. [ ] `npm install` + `npm run lint` + `npm run build` em CADA repo até passarem.
7. [ ] Aplicar correções do `Plano_Ajuste_Loja_Admin_2026-08-10.md` antes de subir a loja (build TS atual quebra).
8. [ ] Vercel: 4 projetos + 4 subdomínios + env vars.
9. [ ] Testar navegação entre subdomínios e login/tema.
10. [ ] **DIREITO DE REGRA — NUNCA subir docs/ no GitHub.**

## 8. REGRA OBRIGATÓRIA: GitHub recebe SÓ código limpo
Documentos de construção NÃO vão para nenhum repo (regra do Anderson).
Ficam locais em `C:\Anderson\Agnaldo Gomes\docs\` (e no Segundo-Cérebro).

Antes de cada push:
- Verificar que `docs/`, `.md` de construção (planos, ajustes, esqueletos, propostas)
  e screenshots de preview NÃO entram no commit.
- Mecanismo: adicionar `docs/` no `.gitignore` de cada repo, e/ou simplesmente NÃO copiar
  a pasta docs do monorepo atual para os novos repos (ela fica só local).
- O único `.md` que pode ir para o repo é o `AGENTS.md` de fronteira (seção 4) — esse é
  instrução para a IA, não documento de construção. `package.json`/`README` (se houver) ok.
- Regra verificada a cada `git add`: usar `git status`/`git add` seletivo, nunca `git add .`
  irresponsável quando houver docs/ na raiz.

---

## 8. Observação de fonte única de produtos
O repo já tem `lib/mockProducts.ts` com a lista centralizada (ids 1–5, imagens /opt).
As páginas loja e detalhe ainda usam mocks inline independentes — ao migrar para a loja,
use `lib/mockProducts.ts` como ÚNICA fonte para eliminar a divergência vitrine/detalhe
(que hoje gera 404 em parte dos produtos — ver Plano de Ajuste, seção 2.1).