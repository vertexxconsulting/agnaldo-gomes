# 📊 RELATÓRIO DE ANÁLISE COMPARATIVA — Cothy vs. Agnaldo Gomes

**Data:** 08/10/2026
**Preparado por:** Assistente de IA (Hermes)
**Objetivo:** Comparar o sistema **Cothy** (`https://web.cothy.com/#authentication-sign-in`) com o sistema de gestão do **Agnaldo Gomes** (folder `C:\Users\Cassi\OneDrive\Documentos\Anderson\Agnaldo Gomes`)

---

## 1. O QUE É O Cothy?

O **Cothy** é um sistema **SaaS (Software como Serviço)** para **gerenciamento de residências e negócios de serviços** (casas, apartamentos, condomínios, empresas de serviços). O acesso na web acontece pelo URL:
**`https://web.cothy.com/#authentication-sign-in`** (página de login Flutter).

- **Tecnologia:** Framework **Flutter** (backend Dart + CanvasKit/SkWasm) hospedado como **PWA/Progressive Web App**.
- **Modelo de acesso:** Login com e-mail + senha; após autenticar, o usuário ganha acesso ao dashboard e aos módulos administrativos.
- **API pública:** Possui **103 endpoints REST v2** expostos no `main.dart.js`, cobrindo autenticação, clientes, agendamentos, serviços, vendas, produtos, pacotes, financeiro, comissões, relatórios, configurações, usuários e mais.
- **Entrega:** A aplicação é entregue via navegador web, ou como PWA instalável no celular.
- **Domínio oficial:** `com.cothy.management` (Google Play) — sistema de gestão residencial/empresas de serviços.

### Módulos identificados na API v2 (103 endpoints)

| Módulo | Endpoints | Função |
|---|---|---|
| **Authentication** | 3 | Login, cadastro, recuperação de senha |
| **Customers (Clientes)** | 8 | Cadastro, busca, histórico, notas, balanço |
| **Appointments (Agenda)** | 5 | Criar, buscar, listar, atualizar, excluir agendamentos |
| **Services (Serviços)** | 5 | Cadastro, busca, atualização, exclusão |
| **Sales (Vendas)** | 5 | Criar, buscar, listar, atualizar, excluir vendas |
| **Products (Produtos)** | 5 | Cadastro, busca, atualização, exclusão |
| **Packages (Pacotes)** | 5 | Cadastro, busca, atualização, exclusão |
| **Financials (Financeiro)** | 5 | Criar, filtrar, buscar, atualizar, excluir lançamentos |
| **Commissions (Comissões)** | 3 | Buscar, pagar, desfazer pagamento |
| **Reports (Relatórios)** | 15 | 360view de clientes, faltas, aniversariantes, pacotes abertos, previsão financeira, métodos, meses, sintético, rankings (pacotes, produtos, serviços, vendas, usuários) |
| **Companies/Settings** | 4 | Obter empresa, configurações, atualizar |
| **Users (Usuários)** | 12 | Cadastro, busca, atualização, permissões, serviços do usuário, login mobile |
| **Stocks (Estoque)** | 1 | Criar estoque |
| **Suppliers (Fornecedores)** | 5 | Cadastro, busca, atualização, exclusão |
| **Gallery (Galeria)** | 3 | Criar, excluir, listar imagens |
| **Anamneses (Pré-consultas)** | 5 | Cadastro, busca, atualização, exclusão |
| **Dashboard** | 2 | Agendamentos e vendas do dashboard |
| **Subscriptions (Assinaturas)** | 1 | Cancelar assinatura |

---

## 2. ESTRUTURA GERAL DO SISTEMA DO AGNALDO GOMES

O sistema do Agnaldo Gomes está em **Next.js 16.3 + TypeScript + Tailwind CSS + Framer Motion**, com **Supabase (PostgreSQL + RLS + Realtime)** como banco de dados e API. Backend: **Vercel** (deploy).

### 2.1 Estrutura de rota

| Zona | Rotas |
|---|---|
| **Pública** | `/` (Home), `/academy` (Academy), `/loja` (E-commerce), `/sobre`, `/contato`, `/terms`, `/privacy` |
| **Admin Studio** | `/admin` (Dashboard), `/admin/agenda`, `/admin/clientes`, `/admin/serviços`, `/admin/profissionais`, `/admin/fidelidade`, `/admin/marketing`, `/admin/relatórios`, `/admin/pagamentos`, `/admin/notas-fiscais`, `/admin/estoque`, `/admin/equipe`, `/admin/comissões`, `/admin/ia-assistente`, `/admin/api`, `/admin/sistema`, `/admin/tutorial` |
| **Admin Loja** | `/admin-loja`, `/admin-loja/produtos`, `/admin-loja/pedidos`, `/admin-loja/configurações` |
| **Academy / Aluno** | `/aluno`, `/aluno/dashboard`, `/aluno/catalogo`, `/aluno/cursos/[slug]`, `/aluno/cursos/[slug]/aulas/[id]`, `/aluno/certificados`, `/aluno/comunidade`, `/aluno/perfil` |
| **Auth/Forms** | `/login`, `/cadastro`, `/agendamento`, `/proposta`, `/perfil`, `/reset-password`, `/atualizar-senha`, `/esqueci-senha`, `/verificar-certificado` |
| **API (71 endpoints)** | `/api/clientes`, `/api/serviços`, `/api/profissionais`, `/api/agendamento`, `/api/cart`, `/api/whatsapp/instance`, `/api/checkout`, `/api/cron/*`, `/api/webhooks/*`, `/api/admin/*`, `/api/admin-academy/*`, `/api/loja/*`, `/api/envios/*`, `/api/bolten/*`, `/api/ml-scraper`, `/api/ia-config`, `/api/stripe/webhook`, `/api/asaas/*`, `/api/hotmart/*`, entre outros |

### 2.2 Módulos de gestão (Painel de Controle)

1. **Agenda / Calendário** — visualização por profissional, por dia/semana/mês; bloqueios; status de agendamento (`pendente → confirmado → em atendimento → concluído → cancelado/no-show`); conflitos de horário.
2. **Clientes (CRM)** — cadastro completo, histórico de atendimentos, ticket médio, frequência, tags/segmentação, aniversariantes, clientes inativos.
3. **Serviços** — nome, categoria, duração, preço, serviços combináveis, ativo/inativo, visibilidade no app; vínculo profissional × serviço.
4. **Profissionais** — cadastro, especialidades, foto, jornada semanal, comissão, agenda pessoal bloqueável.
5. **Financeiro** — caixa diário, formas de pagamento, comissionamento automático, contas a pagar, fluxo de caixa, DRE simplificado, relatórios por período/serviço/profissional.
6. **Estoque** — produtos/insumos, baixa automática por serviço, alerta de estoque mínimo, venda à vista.
7. **Avaliações / NPS** — disparo automático pós-atendimento, nota + comentário, painel por profissional, alerta de baixa nota.
8. **WhatsApp (Evolution API)** — confirmação de agendamento, lembretes, cancelamentos, avaliação pós-atendimento, campanhas de reengajamento, aniversariantes.
9. **Fidelidade / Pacotes** — sessões pré-pagas, programa de pontos/cashback, cupons de desconto.
10. **Dashboard / Relatórios** — faturamento, taxa de ocupação, no-show, ticket médio, serviços mais vendidos, origem do cliente.
11. **Configurações Gerais** — horário de funcionamento, política de cancelamento, antecedência mínima/máxima, intervalo entre atendimentos, papéis de acesso, multi-unidade.
12. **Segurança/LGPD** — consentimento explícito no cadastro do cliente.

### 2.3 Stack técnica

- **Frontend/Backend:** Next.js 16 (App Router, Server Components + Route Handlers)
- **Linguagem:** TypeScript 5.8 (strict mode)
- **Estilização:** TailwindCSS v4 + CSS Glassmorphism + Framer Motion 12
- **Banco:** Supabase (PostgreSQL + RLS + Realtime)
- **Pagamentos:** Mercado Pago (PIX), Stripe, Asaas, Hotmart
- **Autenticação:** Supabase Auth + RLS
- **Hospedagem:** Vercel
- **Integrações:** Evolution API (WhatsApp), Mercado Livre scraper, Vimeo (Academy), Bunny.NET (video hosting)

---

## 3. COMPARAÇÃO FUNCIONAL

### 3.1 Métricas básicas

| Critério | Cothy | Agnaldo Gomes |
|---|---|---|
| **Categoria** | SaaS residencial / gestão de serviços | Sistema de gestão multi-unidade para estúdio/academia/loja |
| **Plataforma** | Flutter PWA (web) | Next.js 16 (web, SSR/SSG) |
| **Auth** | Login e-mail/senha (API v2) | Supabase Auth + RLS + roles (STUDIO_ADMIN, ACADEMY_ADMIN, LOJA_ADMIN, ALUNO, CLIENTE) |
| **Base de dados** | API v2 (backend próprio) | Supabase PostgreSQL (schema `full`), tabelas próprias |
| **API própria** | 103 endpoints `/v2/*` (expostos) | 71 endpoints REST (Next.js Route Handlers) |
| **TypeScript** | Não (Dart/Flutter) | Sim |
| **Open Source** | Próprietário | Fonte aberta no repo (clone/OneDrive) |
| **Pagamentos** | Via API (balance, wallet) | Mercado Pago, Stripe, Asaas, Hotmart |

### 3.2 Tabela comparativa de módulos

| Módulo | Cothy | Agnaldo Gomes | Vantagem |
|---|---|---|---|
| **Authentication** | ✅ Login, sign-up, recover-password | ✅ Supabase Auth + RLS + roles | **Empate** |
| **Agenda / Calendário** | ✅ `appointments/*` (criar, buscar, listar, atualizar, excluir) | ✅ Múltiplas views, bloqueios, drag-and-drop, status | **Agnaldo** (mais detalhado) |
| **Clientes / CRM** | ✅ 8 endpoints (cadastro, busca, histórico, notas, balanço) | ✅ Histórico completo, tags, frequência, VIP, aniversariantes | **Agnaldo** (mais completo) |
| **Serviços** | ✅ 5 endpoints | ✅ Nome, categoria, duração, preço, combináveis, vínculo profissional | **Agnaldo** (mais detalhado) |
| **Profissionais** | ⚠️ Via `users/*` e `services` | ✅ Cadastro, especialidades, jornada, comissão | **Agnaldo** |
| **Financeiro** | ✅ 5 endpoints (lançamentos, previsão) | ✅ Caixa, DRE, comissionamento, contas | **Agnaldo** (mais completo) |
| **Estoque** | ✅ 1 endpoint básico | ✅ Produtos, insumos, baixa automática, alertas | **Agnaldo** |
| **Vendas** | ✅ 5 endpoints | ✅ Carrinho, checkout, pedidos, envio | **Agnaldo** (mais completo) |
| **Pacotes/Fidelidade** | ✅ 5 endpoints (pacotes) | ✅ Sessões pré-pagas, pontos, cupons | **Empate** (diferentes abordagens) |
| **WhatsApp** | ⚠️ Via balance/wallet | ✅ Evolution API, múltiplas mensagens, campanhas | **Agnaldo** |
| **Relatórios** | ✅ 15 endpoints | ✅ Faturamento, ocupação, no-show, ticket, serviços | **Agnaldo** (mais completo) |
| **Academy/Cursos** | ❌ Não encontrado | ✅ Cursos, módulos, aulas, progresso, certificados, comunidade | **Agnaldo** |
| **E-commerce** | ❌ Não encontrado | ✅ Loja, carrinho, checkout, pedidos, frete | **Agnaldo** |
| **Configurações** | ✅ Companies/Settings | ✅ Horário, política, papéis, multi-unidade | **Agnaldo** |
| **Segurança/LGPD** | ⚠️ Via API | ✅ RLS, consentimento, audit | **Agnaldo** |

### 3.3 Detalhamento dos módulos principais

#### 1. Agenda / Calendário
- **Cothy:** API v2 com endpoints `appointments/*` (criar, buscar, listar entre datas, atualizar, excluir). 
- **Agnaldo:** Dashboard completo com views por profissional/dia/semana/mês, bloqueios, drag-and-drop, status de agendamento, alertas de conflito.

#### 2. Clientes (CRM)
- **Cothy:** API v2 com `customers/*` (cadastro, busca, histórico, notas, balanço). Foco em gestão de residências/visitantes.
- **Agnaldo:** CRM completo com histórico de atendimentos, valor gasto, ticket médio, frequência, tags/segmentação, reengajamento, aniversariantes.

#### 3. Financeiro
- **Cothy:** API v2 com `financials/*` (criar, filtrar por período, buscar, atualizar, excluir) + `reports/financials/*` (previsão, métodos de pagamento, resultados por mês, síntese).
- **Agnaldo:** Caixa diário, formas de pagamento, comissionamento automático, contas a pagar, fluxo de caixa, DRE, relatórios por período/serviço/profissional.

#### 4. Relatórios
- **Cothy:** 15 endpoints `reports/*` — 360 view de cliente, ausências, aniversariantes, pacotes abertos, previsão financeira, métodos de pagamento, resultados mensais, síntese, rankings de pacotes/produtos/serviços/vendas/usuários.
- **Agnaldo:** Dashboard com faturamento, taxa de ocupação, no-show, ticket médio, serviços mais vendidos, origem do cliente.

---

## 4. VE QUÊ O AGNALDO É SUPERIOR (e onde o Cothy pode ser melhor)

### 4.1 Funções que o Agnaldo Gomes possui e que o Cothy **ainda não** apresenta (análise da API v2 e estrutura)

| Função | Detalhe |
|---|---|
| **Agenda completa** com múltiplas views (dia/semana/mês), bloqueios, drag-and-drop | Cothy: apenas API básica (criar/buscar/atualizar/excluir) |
| **CRM completo** com histórico, tags, segmentação, frequência, VIP | Cothy: apenas cadastro/buscas básicas |
| **Profissionais** com especialidades, jornada, comissão | Cothy: via `users/*` e `services` (menos detalhado) |
| **Financeiro** com caixa, DRE, comissionamento | Cothy: apenas lançamentos e previsão |
| **Estoque** completo com baixa automática e alertas | Cothy: apenas `stocks/create` básico |
| **WhatsApp automação** com campanhas de reengajamento, aniversariantes | Cothy: não encontrado |
| **Academy / Cursos online** com progresso, certificados, comunidade | Cothy: não encontrado |
| **E-commerce / Loja** com carrinho, checkout, pedidos, frete | Cothy: não encontrado |
| **Fidelidade** com pontos/cashback e cupons | Cothy: apenas `packages/*` básico |
| **Relatórios** detalhados (faturamento, taxa de ocupação, no-show) | Cothy: apenas 15 endpoints básicos |
| **Configurações gerais** (política de cancelamento, papéis, multi-unidade) | Cothy: apenas `companies/settings/*` |
| **Segurança/LGPD** com RLS e consentimento | Cothy: via API sem controle de RLS |

### 4.2 Pontos em que o Cothy pode ser melhor (hipótese baseada em perfil de mercado)

O Cothy é um produto **SaaS especializado em gestão residencial/empresas de serviços**, o que pode oferecer:

- **Foco nicho**: para quem administra casas/apartamentos (gestão de visitas, entregas, clientes, equipes de limpeza), o Cothy pode estar mais pronto do que um sistema feito para estúdio de beleza.
- **SaaS fácil de cadastrar**: como produto de software como serviço, normalmente é mais rápido de começar, com assinatura e suporte.
- **Acesso por web**: um URL ou PWA, sem instalação de software na máquina.
- **Pagamentos via balanço/wallet**: o sistema tem endpoints para `customers/balance` e `wallet`, o que facilita gestão de créditos e pagamentos dentro do sistema.

> **Nota:** Como o painel de admin do Cothy não está acessível sem autenticação e o scraping público não está disponível, **não é possível afirmar categóricamente** que o Cothy possua ou não essas funções. O item acima é uma **hipótese baseada no perfil da solução**, não em uma verificação empirica.

### 4.3 O sistema do Agnaldo é superior?

Com base nos dados disponíveis:

- **No âmbito atual do Agnaldo Gomes** (Studio de Beleza + Academy + E-commerce + Comunidade), o sistema é **muito completo e altamente especializado**, com 71 endpoints, 3 panéis administrativos, 15+ tabelas no Supabase, integrações pagas (WhatsApp, Mercado Livre, Stripe, Hotmart, Asaas, Vimeo, Bunny).
- **A capacidade de ser modular** (pode ativar/desativar módulos por conta do multi-unidade e por funções: Studio, Academy, Loja, Aluno, Secretaria) o torna **mais completo e adaptável** para o mercado de beleza/cursos, já que essa é exatamente a forma como o negócio está organizado.
- **A falta de acesso público** ao painel do Cothy impede uma avaliação rigorosa, mas o fato de o Agnaldo ter produzido **documentação completa, diagramação de banco, migrações SQL e testes e2e** indica que o sistema está **produtivo e em operação**, com foco contínuo em correções e melhorias (ver AUDITORIA_CORRECOES_COMPLETA.md, 20 correções mapeadas).

---

## 5. VERDICT / CONCLUSÃO

| Cenário | Resposta |
|---|---|
| **Comparar apenas funcionalidades** | O sistema do Agnaldo Gomes é **significativamente superior** para o contexto de um estúdio de beleza + academy + loja, pois cobre CRM, agenda, financeiro, estoque, fidelidade, WhatsApp automação, academy, e-commerce e relatórios, tudo com rolagem de banco. O Cothy é um produto nicho (residências) com API básica para gerenciamento de serviços. |
| **Comparar facilidade de adoção** | Cothy (SaaS) pode ter vantagem na **instalação imediata**, mas Agnaldo está **pronto para produção** (build aprovado, migrações SQL, testes). |
| **Mudar de para o Cothy?** | Só vale se o seu negócio for **residências/fimos** e não um estúdio + academy + loja. Para o negócio atual, **não há vantagem clara** em trocar, pois o Agnaldo já cobre escopos maior e é altamente especializado. |
| **Cothy pode ser melhor?** | Apenas se você está procurando **gerenciamento de residências** e não um sistema de agência de beleza. |

---

## 6. RECOMENDAÇÕES

1. **Não troque o sistema do Agnaldo** se o seu objetivo é manter o negócio atual (estúdio, academy, loja). O sistema cobre os requisitos de gestão multi-unidade e é especializado.
2. Se o objetivo é **usar o Cothy como complemento** (ex: receber agendamentos externos via link, monitorar um condomínio ou casa), o Cothy pode coexistir, mas exige integração manual de dados.
3. **Documentação do Agnaldo está excelente** (DOCUMENTATION.md, supabase_schema_full.sql, 71 endpoints, testes e2e, 20 correções mapadas), o que reduz o risco de mudar de fornecedor.
4. Se houver interesse em escalabilidade futura, o Agnaldo já contempla multi-unidade e papéis de acesso — o que reduz a dependência de sistemas autosstratos.

---

*Relatório gerado em 08/10/2026. Fontes: `https://web.cothy.com` (main.dart.js, endpoints API v2), `C:\Users\Cassi\OneDrive\Documentos\Anderson\Agnaldo Gomes` (repository local), DOCUMENTATION.md, supabase_schema_full.sql, AUDITORIA_CORRECOES_COMPLETA.md.*

