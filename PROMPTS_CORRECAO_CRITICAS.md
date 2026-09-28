# Prompts de Correção - Brechas Críticas (🔴)

Use cada prompt abaixo em uma sessão separada do agente para corrigir a vulnerabilidade correspondente.

---

## 🔴 PROMPT 1: Criar tabelas `salon_bride_appointments` e `salon_bride_payments`

```
Crie uma migração SQL para adicionar as tabelas faltantes referenciadas em lib/noivas.ts:

1. `salon_bride_appointments` - agendamentos de noivas (espelho de salon_appointments com campos específicos)
2. `salon_bride_payments` - pagamentos de sinal/parcelas das noivas

Requisitos:
- UUID PK, FK para salon_customers (customer_id), salon_professionals (professional_id), salon_services (service_id via pacote_id)
- Campos: nome_noiva, telefone, email, data_evento, data_agendamento, hora, profissional_id, pacote_id, status (sinal_pendente|sinal_pago|confirmado|concluido|cancelado), sinal_percentual (default 50), observacoes
- Tabela payments: FK para bride_appointments, tipo (sinal|complemento|final), valor, forma (pix|cartao|dinheiro|transferencia), status (pendente|pago), pix_copia_cola, comprovante_url, data_pagamento
- RLS: admins/profissionais gerenciam tudo; clientes veem apenas seus próprios (via telefone/email match)
- Triggers updated_at
- Índices em data_agendamento, status, telefone

Entregue: arquivo SQL pronto para rodar no Supabase SQL Editor.
```

---

## 🔴 PROMPT 2: Corrigir RLS do Salão - separar PROFESSIONAL de ADMIN

```
Corrija as policies RLS em supabase_schema_full.sql (linhas 396-401) que atualmente permitem PROFESSIONAL gerenciar tudo igual a ADMIN.

Problema atual:
```sql
CREATE POLICY "Admins manage salon_customers" ON salon_customers FOR ALL USING (public.get_user_role() IN ('ADMIN', 'PROFESSIONAL'));
-- ... igual para services, professionals, appointments, blocks
```

Correção necessária:
1. **ADMIN** (role = 'ADMIN' no profiles): CRUD total em todas as tabelas do salão
2. **PROFESSIONAL** (role = 'PROFESSIONAL' + user_id na tabela salon_professionals): 
   - SELECT próprio perfil em salon_professionals
   - SELECT/UPDATE próprios agendamentos em salon_appointments (onde professional_id = seu id)
   - SELECT próprios bloqueios em salon_schedule_blocks
   - NÃO pode: gerenciar clientes, serviços, outros profissionais, agendamentos de outros
3. **STUDIO_SECRETARIA** (novo role customizado via user_metadata): CRUD em customers, appointments, services (readonly professionals)

Entregue: bloco SQL corrigido (apenas as policies 7.6) para substituir no schema_full.sql.
```

---

## 🔴 PROMPT 3: Remover auto-inscrição em requireEnrollment (Academy)

```
Em lib/api-auth.ts, função requireEnrollment (linhas 96-108), remova o bloco que AUTO-INSCREVE o aluno no curso quando não há matrícula.

Código problemático:
```typescript
if (!enrollment) {
  try {
    await supabase.from('course_enrollments').insert({ user_id: user.id, course_id: cursoId });
  } catch { }
  return baseAuth; // LIBERA ACESSO SEM PAGAMENTO
}
```

Comportamento correto:
- Se `enrollment` não existe E usuário NÃO é admin/academy_admin/studio_admin → retornar 403 "Curso não adquirido"
- Apenas admins/gestores têm acesso irrestrito (linha 80 já faz isso)
- Aluno deve ter registro em `course_enrollments` com status ativo (ou payment aprovado via webhook)

Entregue: função requireEnrollment corrigida + teste unitário simulando aluno sem matrícula tentando acessar /aluno/cursos/:id/aulas/:id.
```

---

## 🔴 PROMPT 4: Implementar webhook Mercado Pago para Loja (orders + estoque)

```
Crie/atualize app/api/webhooks/mercadopago/route.ts para processar notificações de pagamento da Loja e atualizar pedido + baixar estoque.

Fluxo:
1. Receber POST do MP (topic=payment ou merchant_order)
2. Buscar payment_id no MP SDK (validar assinatura se houver)
3. Localizar order em `orders` onde payment_id = notification.payment_id OU payment_link contém o ID
4. Se payment.status = 'approved':
   - Atualizar order.status = 'PAID'
   - Para cada order_item: decrementar products.stock_quantity (apenas type=LOCAL_STOCK)
   - Se estoque < 0 → alertar log, não impedir (race condition), mas registrar
5. Se payment.status = 'cancelled'/'rejected' → order.status = 'CANCELLED'
6. Idempotência: processar apenas uma vez por payment_id (tabela mp_webhook_logs com UNIQUE payment_id)
7. Responder 200 OK em < 500ms (processar em background se necessário)

Entregue: route.ts completo + migração para tabela mp_webhook_logs + instruções de configurar URL no painel MP.
```

---

## 🔴 PROMPT 5: Validar conflito de horário no agendamento público

```
Em app/api/agendamento/route.ts (POST), adicione validação de disponibilidade ANTES de inserir em salon_appointments.

Regras:
- Mesmo professional_id + mesma data + horário sobreposto (start_time < novo_fim AND end_time > novo_inicio) + status IN ('PENDING','CONFIRMED','IN_PROGRESS') = CONFLITO
- Considerar salon_schedule_blocks (bloqueios do profissional na data/hora)
- Considerar jornada_semanal do profissional (dia da semana + horário permitido)
- Retornar 409 { error: 'Horário indisponível', conflitos: [...] } se houver

Otimização:
- Query única com EXISTS ou FOR SHARE lock para evitar race condition
- Se Supabase não estiver disponível (modo demo), pular validação mas logar warning

Entregue: trecho de código para inserir entre linha 130-150 (após calcular horaFim, antes de inserir).
```

---

## 🔴 PROMPT 6: Adicionar idempotency key no webhook Bolten

```
Atualize app/api/webhooks/bolten/route.ts para garantir processamento idempotente.

Problema: Bolten pode reenviar mesma notificação múltiplas vezes → cria agendamentos/clientes duplicados.

Solução:
1. Header `X-Bolten-Event-ID` ou campo `event_id` no payload = chave única
2. Tabela `bolten_webhook_events` (event_id PK, payload JSONB, processed_at, created_at)
3. No início do handler: 
   ```sql
   INSERT INTO bolten_webhook_events (event_id, payload) VALUES ($1, $2) ON CONFLICT DO NOTHING;
   ```
   Se `ROW_COUNT = 0` → já processado, retornar 200 OK silencioso
4. Processar payload (criar/atualizar cliente, agendamento, etc.)
5. Atualizar `processed_at = now()` ao final

Entregue: route.ts atualizado + migração SQL da tabela + logs de debug para rastrear duplicatas.
```

---

## 📋 Como usar

```bash
# Para cada prompt, abra nova conversa e cole o conteúdo
# Exemplo ordem recomendada:
# 1 → 2 → 3 → 4 → 5 → 6

# Após cada correção, rode:
pnpm run build
pnpm run lint
# Teste manual do fluxo corrigido
```

---

## ✅ Checklist de validação pós-correções

| Item | Como testar |
|------|-------------|
| Tabelas Noivas criadas | `psql -c "SELECT * FROM salon_bride_appointments LIMIT 1"` |
| RLS corrigido | Login como professional → tentar DELETE em salon_customers → deve falhar |
| Auto-inscrição removida | Aluno sem matrícula acessa /aluno/cursos/uuid/aulas/uuid → 403 |
| Webhook MP Loja | Simular payment.approved no painel MP → order.status=PAID + estoque baixou |
| Conflito horário | Tentar agendar 2x mesmo profissional/horário → 409 na 2ª |
| Idempotência Bolten | Reenviar mesmo payload 3x → apenas 1 agendamento criado |

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
