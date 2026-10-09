# Plano de Ajuste — Loja e Admin (Site Agnaldo Gomes)

Data: 2026-08-10
Autor: Anderson (ainda pendente de execução)
Escopo: Loja pública (`app/(shop)/loja`) + Admin da loja (`app/admin-loja` e `app/admin/loja`)
Tipo: Documento de ajuste / correção. Nenhuma alteração de código foi feita nesta sessão (revisão apenas).

Base da revisão:
- `npm run lint` → 27 erros / 49 avisos (muitos pré-existentes no projeto)
- `npm run build` → FALHA: `error TS18047 ... Failed to type check`
- Verificação de assets `/opt/*` (existem) e `remotePatterns` do `next.config.ts` (`http2.mlstatic.com` liberado, ok)

---

## 1. QUEBRA O SISTEMA (bloqueante de build — prioridade máxima)

### 1.1 Erro de TypeScript no build — BLOQUEIA PRODUÇÃO
| Item | Detalhe |
|------|---------|
| Arquivo | `app/admin-loja/produtos/page.tsx:135` |
| Erro | `TS18047: 'produto.stock' is possibly 'null'` |
| Causa | `stock: number | null` (produto afiliado usa `stock: null`) e a linha compara `produto.stock > 0` direto |
| Correção | Trocar por `(produto.stock ?? 0) > 0` |

> Este é o erro que derruba o build/deploy da loja neste momento.

### 1.2 Erros de Lint que voltam a quebrar o build após o item 1.1
Não há `eslint.ignoreDuringBuilds`, então depois de resolver o TS o build para na fase de lint. Erros nos arquivos da loja:

| Arquivo / linha | Regra | Correção sugerida |
|-----------------|-------|-------------------|
| `app/(shop)/layout.tsx:17` | setState no effect (padrão `setMounted(true)`) | Usar flag de hydração sem `setState` síncrono (ex.: ler de `useSyncExternalStore` ou mover para callback) |
| `app/(shop)/loja/carrinho/page.tsx:14` | idem | idem |
| `app/(shop)/loja/checkout/page.tsx:21` | idem | idem |
| `app/admin-loja/produtos/novo/page.tsx:71` | `react/no-unescaped-entities` | Escapar aspas (`&quot;` / `&ldquo;`) |
| `app/api/ml-scraper/route.ts:35–36` | `prefer-const` | Trocar `let` por `const` |
| `components/SystemTutorial.tsx:32,110` | `react/no-unescaped-entities` | Escapar aspas (pré-existente, fora da loja) |

---

## 2. QUEBRA O FLUXO DA LOJA

### 2.1 Mock dos produtos divergente (vitrine vs detalhe) → 404 em metade da loja
| Item | Detalhe |
|------|---------|
| Vitrine | `app/(shop)/loja/page.tsx` lista 6 produtos (ids 1–6) |
| Detalhe | `app/(shop)/loja/p/[id]/page.tsx:12` SÓ tem os ids 1, 2, 3 |
| Efeito | Prancha MQ Pro, Óleo Reparador e Máquina Wahl abrem `notFound()` → **página 404** |
| Correção | Centralizar um ÚNICO array de produtos (fonte única), ou adicionar os 3 itens faltantes no mock do detalhe |

### 2.2 Checkout envia apenas o 1º item (agregado genérico)
| Item | Detalhe |
|------|---------|
| Arquivo | `app/(shop)/loja/checkout/page.tsx:50` |
| O que envia | `productId: items[0]?.id` e `product: { nome: 'Pedido AG Store', price: getTotal() }` |
| Efeito | Carrinho multi-item → Mercado Pago recebe 1 item genérico "Pedido AG Store" qty 1 com o valor total. Cobra certo, mas recibo/descrição errados e ignora os itens/quantidades reais |
| Correção | Enviar o array completo de itens (`items.map(→ { id, title, quantity, unit_price })`) no body do `/api/checkout` |

### 2.3 Checkout em "modo demonstração" redireciona para página morta
| Item | Detalhe |
|------|---------|
| Arquivo | `app/api/checkout/route.ts:72` |
| O que faz | Sem token MP real, devolve `paymentUrl` fake (`pref_id=SIMULADO-...` + flag `simulated: true`) |
| Front | `checkout/page.tsx:57` faz `window.location.href = data.paymentUrl` → cliente cai numa página morta do Mercado Pago |
| Efeito | A compra "aparenta" funcionar mas não existe pedido; o cliente é perdido no meio do fluxo |
| Correção | Quando `data.simulated`, NÃO redirecionar: mostrar aviso "modo demonstração / pagamento indisponível" e manter o usuário no checkout |

### 2.4 Segurança de preço no checkout
| Item | Detalhe |
|------|---------|
| Arquivo | `app/api/checkout/route.ts:21` |
| Risco | O preço usado para criar a Preference MP vem do cliente (`product?.price`). O próprio código admite no comentário |
| Efeito | Cliente pode manipular o valor no request e pagar menos |
| Correção | Buscar preço no banco (Supabase) no backend, nunca confiar no body |

---

## 3. LINKS MORTOS E INCONSISTÊNCIAS (UX)

| # | Onde | Problema | Correção |
|---|------|----------|----------|
| 3.1 | `app/(shop)/loja/page.tsx:136` | "Ver Todos" → `/loja/todos` não existe → 404 | Criar rota `/loja/todos` ou apontar para `/loja` |
| 3.2 | Topbar `Saiba Mais` (`layout.tsx:26`) | `href="#"` sem alvo | Linkar para política/troca real ou remover |
| 3.3 | Header "Atendimento" / "Minha Conta" (`layout.tsx:67,72`) | `href="#"` | Ligar a rota existente ou esconder |
| 3.4 | Busca (desktop+mobile) | Botão sem handler | Implementar filtro ou remover |
| 3.5 | Footer "Trocas e Devoluções / Prazos / Termos" | `href="#"` | Criar/apontar para páginas de política |
| 3.6 | Menu mobile (categorias) | Todos apontam p/ `/loja`, sem filtro | Ligar a `?cat=` ou rota própria |
| 3.7 | Topbar "FRETE GRÁTIS acima de R$299" | Texto estático, nenhuma regra aplica | Implementar no cálculo de subtotal/frete |
| 3.8 | Cálculo de frete mock (CEP `8426`) | Não valida se CEP é numérico (só `length>=8`); placeholder com hífen vs `maxLength=8` | Validar formato `\d{5}-?\d{3}` e alinhar mask |

---

## 4. ARQUITETURA / CONSISTÊNCIA

### 4.1 Dois admins da loja duplicados e divergentes
| | `app/admin/loja` | `app/admin-loja` |
|---|---|---|
| Posição | Dentro do CRM | Standalone |
| Integração | usa `/api/ml-scraper`, `Button`, theme do site | só mock |
| Shape do produto | `name / image_url / ml_link` | `name / price / mlLink / stock` |
| Apontado pelo nav | SIM (admin/layout.tsx:21) | NÃO (órfão) |

- **Decisão pendente:** qual admin fica? Consolidar em um só e remover/apontar o outro.
- Recomendação: manter `app/admin-loja` (mais completo, categorias Dashboard/Produtos/Pedidos/Configurações), remover `app/admin/loja` (ou vice-versa, se preferir a integração com o CRM).

### 4.2 Sem proteção de acesso
- `/admin`, `/admin-loja` e `/loja` não têm `middleware`/session check. Hoje é tudo mock, mas **antes de ligar o Supabase é obrigatório** guard de autenticação em admin e validação no checkout.

### 4.3 ml-scraper (SSRF + parsing frágil)
- `app/api/ml-scraper/route.ts` faz `fetch` de URL arbitrária vinda do cliente → risco de **SSRF**.
- Regex de `og:` ainda não casam com o markup atual do ML → scrap pode falhar em silêncio (cai em preenchimento manual).
- Em produção: restringir domínios (whitelist mercadolivre.com.br) e rever o parser.

### 4.4 Persistência zero
- `app/admin/loja/page.tsx` "Salvar produto" só adiciona em memória (`setProducts` local). Esperado enquanto Supabase está mock, mas precisa migrar para BD antes de go-live.

---

## 5. PRIORIDADE DE EXECUÇÃO

1. **1.1** — Corrigir o TS do build (`produto.stock`).
2. **1.2** — Corrigir lint dos arquivos da loja (para o build não voltar a parar).
3. **2.1** — Unificar o mock de produtos (acabar com os 404).
4. **2.2 / 2.3** — Checkout correto (enviar itens) + não redirecionar em modo demo.
5. **3.1** — Link `/loja/todos` morto.
6. **4.1** — Decidir e consolidar o admin da loja.

---

## 6. NOTAS (verificado OK)
- Assets `/opt/logo-branca.webp` e `produto1..3.png` existem em `public/opt`.
- `next.config.ts` já libera `http2.mlstatic.com` nas `remotePatterns` (imagens dos produtos funcionam).
- Item de frete e subtotal no carrinho estão coerentes entre si (entrega/detalhe/preço valores batem — exceto as regras de "frete grátis" da seção 3.7).

## 7. PRÓXIMOS PASSOS
- Aguardar decisão do Anderson sobre o escopo de correção (só build vs pacote completo) e sobre qual admin da loja manter (4.1).
- Após decisão: aplicar as correções e rodar `npm run lint` + `npm run build` até passarem limpos.