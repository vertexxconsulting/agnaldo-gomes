# 📋 Auditoria Completa - Plano de Correções (Todas as Prioridades)

> Gerado em: 2026-09-15  
> Sistema: Agnaldo Gomes Studio + Academy + Loja  
> Stack: Next.js 14 (App Router) + Supabase + TypeScript + Tailwind

---

## 🎯 Resumo Executivo

| Prioridade | Quantidade | Estimativa |
|------------|------------|------------|
| 🔴 Crítico (bloqueia produção) | 6 | 2-3 dias |
| 🟡 Alto (esta semana) | 7 | 3-4 dias |
| 🟢 Médio (próximo sprint) | 7 | 1-2 semanas |
| **Total** | **20** | **~2-3 semanas** |

---

## 🔴 CRÍTICO - Bloqueiam Entrega em Produção

### 1. Tabelas `salon_bride_appointments` e `salon_bride_payments` inexistentes
**Arquivos afetados:** `lib/noivas.ts` (linhas 139, 140), `app/api/agendamento/route.ts` (linhas 173-190)  
**Erro:** `42P01: relation "salon_bride_appointments" does not exist`  
**Ação:** Criar migração SQL com RLS, triggers, índices.  
**Prompt:** Ver `PROMPTS_CORRECAO_CRITICAS.md` → Prompt 1

### 2. RLS do Salão permite PROFESSIONAL gerenciar tudo como ADMIN
**Arquivo:** `supabase_schema_full.sql` linhas 396-401  
**Risk:** Profissional vê/exclui clientes de outros, altera serviços, agendamentos alheios.  
**Ação:** Separar policies por role real (ADMIN vs PROFESSIONAL vs STUDIO_SECRETARIA).  
**Prompt:** Ver `PROMPTS_CORRECAO_CRITICAS.md` → Prompt 2

### 3. Auto-inscrição em `requireEnrollment` burla pagamento da Academy
**Arquivo:** `lib/api-auth.ts` linhas 96-108  
**Risk:** Aluno acessa curso pago sem comprar — `insert` silencioso em `course_enrollments`.  
**Ação:** Remover bloco `if (!enrollment) { insert... }`; retornar 403 se sem matrícula válida.  
**Prompt:** Ver `PROMPTS_CORRECAO_CRITICAS.md` → Prompt 3

### 4. Webhook Mercado Pago (Loja) não atualiza pedido nem baixa estoque
**Arquivo:** `app/api/webhooks/mercadopago/route.ts` (precisa criar/atualizar)  
**Risk:** Pedidos ficam `PENDING_PAYMENT` eternamente; estoque não decrementa → overselling.  
**Ação:** Processar `payment.approved` → `order.status=PAID` + `stock_quantity--` (LOCAL_STOCK) + idempotência.  
**Prompt:** Ver `PROMPTS_CORRECAO_CRITICAS.md` → Prompt 4

### 5. Agendamento público não valida conflito de horário (overbooking)
**Arquivo:** `app/api/agendamento/route.ts` (POST, após linha 140)  
**Risk:** Dois clientes agendam mesmo profissional/horário.  
**Ação:** Query de conflito (`EXISTS` com overlap) + checar `salon_schedule_blocks` + `jornada_semanal`. Retornar 409.  
**Prompt:** Ver `PROMPTS_CORRECAO_CRITICAS.md` → Prompt 5

### 6. Webhook Bolten sem idempotência → duplicatas no CRM
**Arquivo:** `app/api/webhooks/bolten/route.ts`  
**Risk:** Reenvio de notificação cria agendamentos/clientes duplicados.  
**Ação:** Tabela `bolten_webhook_events` (event_id PK) + `ON CONFLICT DO NOTHING`.  
**Prompt:** Ver `PROMPTS_CORRECAO_CRITICAS.md` → Prompt 6

---

## 🟡 ALTO - Devem ser Feitos Esta Semana

### 7. Dashboard Academy usa mock-data (não reflete BD real)
**Arquivos:** `app/admin-academy/page.tsx` (usa `getCursos` de `mock-data.ts`), `app/admin-academy/alunos/page.tsx` (calcula progresso no frontend com 100+ queries)  
**Ação:** 
- Criar API `/api/admin-academy/dashboard/stats` que agrega no server (Supabase RPC ou view)
- Migrar `alunos/page.tsx` para usar endpoint único `/api/admin-academy/alunos?withProgress=true`
- Remover dependência de `mock-data.ts` no admin

### 8. Validação de matrícula antes de liberar aula (Player)
**Arquivos:** `app/aluno/(logged)/cursos/[cursoId]/aulas/[aulaId]/page-client.tsx`, `components/LessonPlayer.tsx`  
**Risk:** Aluno manipula URL e assiste aula de curso não comprado.  
**Ação:** 
- Middleware/Server Component em `page.tsx` (não client) que chama `requireEnrollment` ANTES de renderizar player
- Player recebe `aula` já validada via props, não busca direto no client

### 9. Certificados Academy: geração não implementada
**Arquivos:** `app/admin-academy/certificados/page.tsx` (placeholder), `app/aluno/(logged)/certificados/page.tsx` (placeholder)  
**Ação:** 
- Tabela `course_certificates` (id, user_id, course_id, issued_at, certificate_number, pdf_url, verification_hash)
- Trigger/RPC: ao completar 100% das aulas (`lesson_progress`), gerar PDF (pdf-lib ou Puppeteer) + salvar no Storage
- Página admin: listar, reemitir, revogar
- Página aluno: baixar, compartilhar link de verificação pública

### 10. Checkout Academy inexistente (sem monetização)
**Arquivos:** `app/api/academy/checkout/route.ts` (existe mas incompleto), `lib/pagamentos-academy.ts`  
**Ação:** 
- Integrar Stripe (checkout.session) ou Mercado Pago (preference) para cursos pagos
- Webhook → criar `course_enrollments` + `payment_records` (nova tabela)
- Catálogo aluno (`/aluno/catalogo`) mostrar preço + botão "Comprar" se não matriculado

### 11. Carrinho da Loja só existe no client (perde ao recarregar)
**Arquivos:** `store/cartStore.ts` (Zustand), `components/AddToBasketButton.tsx`  
**Ação:** 
- Tabelas `carts` (user_id/session_id, status, created_at) + `cart_items` (cart_id, product_id, quantity, unit_price)
- API `/api/cart` (GET/POST/PATCH/DELETE) server-side
- Hydrate store do Zustand com dados do server no login/entrada

### 12. Pedido Loja criado sem validação de estoque
**Arquivo:** `app/api/checkout/route.ts` (POST)  
**Risk:** Vende produto sem estoque (LOCAL_STOCK).  
**Ação:** 
- Transação: `SELECT ... FOR UPDATE` em products → checar `stock_quantity >= quantity` → decrementar → criar order + items
- Se insuficiente: 409 `{ error: 'Estoque insuficiente', productId, available }`

### 13. Tabela de auditoria `salon_appointment_logs` ausente
**Ação:** 
```sql
CREATE TABLE salon_appointment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES salon_appointments(id),
  changed_by UUID REFERENCES profiles(id),
  field_changed TEXT, -- 'status', 'professional_id', 'date', etc.
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Trigger em salon_appointments (AFTER UPDATE) para popular automaticamente
```

---

## 🟢 MÉDIO - Próximo Sprint

### 14. Comunidade Academy: tabelas + UI inexistentes
**Ação:** 
- Tabelas: `community_posts` (course_id nullable, user_id, content, parent_id), `post_reactions` (post_id, user_id, type), `post_comments`
- RLS: aluno vê posts do curso matriculado; admin gerencia tudo
- UI: feed no `/aluno/comunidade` + `/admin-academy/comunidade` (moderação)

### 15. Cupons de desconto (Loja + Academy)
**Ação:** 
- Tabela `coupons` (code UNIQUE, type: percent|fixed, value, min_order, max_uses, used_count, valid_from, valid_until, applicable_to: 'shop'|'academy'|'all', course_ids[], product_ids[])
- Validação no checkout (Loja + Academy)
- Admin: CRUD em `/admin-loja/configuracoes` e `/admin-academy/configuracoes`

### 16. Notificações push/email (agendamento, pagamento, aula nova)
**Ação:** 
- Tabela `notifications` (user_id, type, title, body, data JSONB, read_at, created_at)
- Providers: Evolution API (WhatsApp), SendGrid/Resend (email), Web Push (VAPID)
- Triggers: agendamento confirmado, pagamento aprovado, nova aula publicada, lembrete 24h antes

### 17. Relatórios financeiros unificados (Salão + Academy + Loja)
**Ação:** 
- View materializada `mv_financeiro_diario` (date, revenue_salon, revenue_academy, revenue_shop, appointments_count, orders_count, enrollments_count)
- Job cron diário (pg_cron ou Vercel Cron) para refrescar
- Página `/admin/relatorios/financeiro` com filtros de período, export CSV/PDF

### 18. RLS `course_enrollments` permite INSERT público (grátis)
**Arquivo:** `supabase_schema_full.sql` linha 346  
```sql
-- ATUAL:
CREATE POLICY "Users insert own enrollments" ON course_enrollments FOR INSERT WITH CHECK (true);
-- CORRIGIR:
CREATE POLICY "Users insert own enrollments" ON course_enrollments FOR INSERT WITH CHECK (
  user_id = auth.uid() AND 
  EXISTS (SELECT 1 FROM courses WHERE id = course_id AND price = 0) -- apenas cursos gratuitos
);
-- Cursos pagos: INSERT apenas via service_role (webhook pagamento)
```

### 19. Player de aula não valida tempo mínimo de exibição
**Arquivo:** `components/LessonPlayer.tsx`  
**Ação:** 
- Rastrear `currentTime` + `duration`; só marcar `completed=true` se `currentTime >= duration * 0.9` (90%)
- Enviar progresso a cada 30s (debounce) para `lesson_progress.assistido_segundos` (nova coluna)

### 20. Testes E2E dos fluxos críticos
**Ferramenta:** Playwright (já no `package.json`?)  
**Cenários obrigatórios:**
1. Agendamento público → PIX Noiva → Webhook MP → Confirmação → Aparece no `/admin/noivas`
2. Aluno compra curso (Academy) → Webhook → Matrícula criada → Acessa aula → Completa → Certificado gerado
3. Cliente compra produto Loja (LOCAL_STOCK) → Pagamento aprovado → Estoque baixado → Etiqueta gerada
4. Profissional loga → Vê apenas sua agenda → Não acessa clientes de outros
5. Secretaria loga → Vê Studio (CRM/Agenda) → NÃO vê Academy/Loja

---

## 📦 Migrações SQL Necessárias (Resumo)

| # | Tabela | Arquivo sugerido |
|---|--------|------------------|
| 1 | `salon_bride_appointments`, `salon_bride_payments` | `supabase_migration_noivas.sql` |
| 2 | `bolten_webhook_events` | `supabase_migration_bolten_idempotency.sql` |
| 3 | `mp_webhook_logs` | `supabase_migration_mp_webhook.sql` |
| 4 | `course_certificates` | `supabase_migration_certificates.sql` |
| 5 | `carts`, `cart_items` | `supabase_migration_cart.sql` |
| 6 | `salon_appointment_logs` | `supabase_migration_audit.sql` |
| 7 | `community_posts`, `post_reactions`, `post_comments` | `supabase_migration_community.sql` |
| 8 | `coupons` | `supabase_migration_coupons.sql` |
| 9 | `notifications` | `supabase_migration_notifications.sql` |
| 10 | `lesson_progress.assistido_segundos` (ALTER TABLE) | `supabase_migration_lesson_progress.sql` |

---

## 🔧 Comandos de Validação Pós-Correção

```bash
# 1. Build + Lint
pnpm run build && pnpm run lint

# 2. Verificar schema aplicado
psql $DATABASE_URL -c "\dt salon_*"
psql $DATABASE_URL -c "\dt course_*"
psql $DATABASE_URL -c "\dt cart*"
psql $DATABASE_URL -c "\dt *webhook*"

# 3. Testar RLS
psql $DATABASE_URL -c "SET ROLE authenticated; SET request.jwt.claims TO '{\"role\":\"PROFESSIONAL\"}'; DELETE FROM salon_customers LIMIT 1;" 
# Deve falhar com "permission denied"

# 4. Simular webhooks localmente
# MP: ngrok + curl -X POST http://localhost:3000/api/webhooks/mercadopago -d '{"type":"payment","data":{"id":"test_123"}}'
# Bolten: similar

# 5. Testes E2E
pnpm run test:e2e  # ou npx playwright test
```

---

## 📁 Arquivos de Referência Criados

- `PROMPTS_CORRECAO_CRITICAS.md` — 6 prompts prontos para agente (itens 🔴)
- `AUDITORIA_CORRECOES_COMPLETA.md` — Este arquivo (todos os 20 itens)

---

## 🚀 Ordem Recomendada de Execução

```
Semana 1 (Críticos):
  Dia 1-2: 1, 2, 3  (BD + RLS + Auth)
  Dia 3-4: 4, 5, 6  (Webhooks + Validações)

Semana 2 (Altos):
  Dia 1-2: 7, 8     (Academy real + Player seguro)
  Dia 3:   9, 10    (Certificados + Checkout Academy)
  Dia 4:   11, 12   (Carrinho persistente + Estoque)
  Dia 5:   13       (Auditoria)

Semana 3 (Médios):
  14-20 conforme prioridade de negócio
```

---

## ✅ Definition of Done (Por Item)

- [ ] Migração SQL aplicada no Supabase (staging + prod)
- [ ] Código alterado + `pnpm run build` passa
- [ ] `pnpm run lint` passa (zero erros)
- [ ] Teste manual do fluxo corrigido (checklist acima)
- [ ] Testes E2E adicionados/atualizados (Playwright)
- [ ] Documentação atualizada (README, CHANGELOG)
- [ ] Deploy staging validado pelo PO