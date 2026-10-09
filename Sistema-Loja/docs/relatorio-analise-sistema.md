RELATÓRIO DE ANÁLISE PROFUNDA — SISTEMA AGNALDO GOMES
Data: 12/08/2026 (Atualizado pós-migração Supabase — Fase 2)

---

1. RESUMO EXECUTIVO

Sistema: monorepo Next.js 16.3 (App Router + Turbopack) para o ecossistema Agnaldo Gomes.
Domínios: Studio de Beleza, Academy (cursos online), E-commerce (loja de produtos), APIs (WhatsApp/Evolution, Mercado Livre scraper, Checkout).

Status do build: APROVADO — 55/55 rotas compiladas
Status do middleware: INSTALADO — rotas admin/aluno protegidas
Status do Supabase adapter: IMPLEMENTADO — fallback automático de mock → real
Status do TypeScript: SEM ERROS
Status do ESLint (arquivos modificados): 0 ERROS / 0 WARNINGS

---

2. ESTRUTURA DE ROTAS

(public)         /, /studio, /academy, /sobre, /contato, /politica, /termos
(shop)           /loja, /loja/carrinho, /loja/checkout, /loja/categoria/[slug], /loja/p/[id]
Admin Studio     /admin, /admin/agenda, /admin/clientes, /admin/profissionais, /admin/servicos, /admin/atividades, /admin/tutorial, /admin/sistema, /admin/perfil
Admin Academy    /admin-academy, /admin-academy/login, /admin-academy/alunos, /admin-academy/cursos, /admin-academy/cursos/[cursoId], /admin-academy/comunidade, /admin-academy/configuracoes, /admin-academy/certificados, /admin-academy/tutorial, /admin-academy/perfil
Admin Loja       /admin-loja, /admin-loja/login, /admin-loja/produtos, /admin-loja/pedidos, /admin-loja/configuracoes, /admin-loja/produtos/novo
Aluno            /aluno, /aluno/dashboard, /aluno/catalogo, /aluno/cursos/[cursoId], /aluno/cursos/[cursoId]/aulas/[aulaId], /aluno/certificados, /aluno/comunidade, /aluno/perfil, /aluno/tutorial
Auth/Forms       /login, /academy/login, /cadastro, /proposta, /perfil, /agendamento
API Routes       /api/checkout, /api/env-status, /api/ml-scraper, /api/whatsapp/instance, /api/whatsapp/status

---

3. CORREÇÕES IMPLEMENTADAS (Fase 1 + Fase 2)

3.1 Middleware de Autenticação (CRÍTICO)
- /middleware.ts — protege rotas admin/aluno via cookies Supabase
- /admin → /login, /admin-academy → /admin-academy/login, /admin-loja → /admin-loja/login, /aluno → /academy/login

3.2 Login de Admin Academy
- app/admin-academy/login/page.tsx (novo)
- Layout: não renderiza sidebar na página de login
- Logout redireciona para /admin-academy/login

3.3 Área do Aluno → Supabase Adapter Layer
- lib/mock-data.ts: adicionadas funções async com fallback

3.3.1 Funções async para cursos criadas:
- getCursos(): Promise<Curso[]> — tenta Supabase, fallback MOCK_CURSOS
- getModulos(cursoId?): Promise<Modulo[]> — tenta Supabase, fallback MOCK_MODULOS
- getAulas(moduloId?): Promise<Aula[]> — tenta Supabase, fallback MOCK_AULAS
- getProgressoAluno(): Promise<Progresso[]> — tenta Supabase com user_id, fallback MOCK_PROGRESSO_ALUNO

3.3.2 Páginas do aluno atualizadas:
- /aluno/(logged)/cursos/page.tsx: useEffect carrega getCursos + getProgressoAluno; loading skeleton; fallback mock progresso
- /aluno/(logged)/dashboard/page.tsx: useEffect carrega cursos/modulos/aulas/progresso; carrega lookup maps; "Continue Assistindo" dinâmico; loading skeleton
- /aluno/(logged)/cursos/[cursoId]/page.tsx: useEffect carrega todos; progresso calculado dinamicamente; urlContinuar baseado em dados reais
- /aluno/(logged)/cursos/[cursoId]/aulas/[aulaId]/page.tsx: useEffect carrega dados; estado concluida sincronizado com progresso; sidebar de aulas dinâmico
- /aluno/(logged)/certificados/page.tsx: useEffect carrega dados; calcula cursos com 100% de progresso; gera certificados dinamicamente

3.4 Admin Panel (Fase 1 — já implementado)
- Agenda: getAgendamentos, getBloqueios, getProfissionais
- Clientes: getClientes, getAgendamentos
- Profissionais: getProfissionais, getServicos, getProfissionalServico
- Serviços: getServicos, getProfissionalServico, getProfissionais

3.5 Correções Menores
- Links do footer da loja (/politicas → /politica-de-privacidade, /termos → /termos-de-uso)
- Header: link "Área do Aluno" → /academy/login
- Cadastro: supabase.auth.signUp() real
- Perfil: tipagem explícita + aviso de modo demo
- API WhatsApp: proteção x-api-key
- Typo: configuracao → configuracoes

---

4. ARQUIVOS CRIADOS/MODIFICADOS

Novos:
1. middleware.ts (144 linhas)
2. app/admin-academy/login/page.tsx
3. lib/supabase-queries.ts (180 linhas)

Modificados:
4. app/(shop)/layout.tsx (footer links)
5. app/aluno/(logged)/cursos/page.tsx (Supabase adapter)
6. app/aluno/(logged)/dashboard/page.tsx (Supabase adapter)
7. app/aluno/(logged)/cursos/[cursoId]/page.tsx (Supabase adapter)
8. app/aluno/(logged)/cursos/[cursoId]/aulas/[aulaId]/page.tsx (Supabase adapter)
9. app/aluno/(logged)/certificados/page.tsx (Supabase adapter)
10. app/aluno/(logged)/layout.tsx (logout consistente)
11. app/aluno/page.tsx (link entrar + aspas escapadas)
12. app/cadastro/page.tsx (Supabase Auth real)
13. app/perfil/page.tsx (tipagem + texto demo)
14. app/admin-academy/layout.tsx (typo + login sem sidebar)
15. app/api/whatsapp/instance/route.ts (proteção)
16. app/api/whatsapp/status/route.ts (proteção)
17. components/Header.tsx (link aluno)
18. lib/mock-data.ts (adapter layer async)
19. .env.example (WHATSAPP_WEBHOOK_KEY documentada)

---

5. PROBLEMAS QUE AINDA PERSISTEM

5.1 Checkout da Loja é Mockado
- /loja/carrinho e /loja/checkout usam dados mockados
- API /api/checkout existe mas não é chamada da UI
- MERCADO_PAGO_ACCESS_TOKEN não configurado

5.2 Lint Pré-existente (arquivos não modificados)
- Erros em: app/aluno/dashboard (remanescente), app/api/checkout, app/admin-loja/comunidade
- Não críticos — não quebram build

5.3 Imagem Fixa
- <img> tags usadas em vez de <Image /> em alguns componentes
- Warnings de lint, não crítico

---

6. PRÓXIMOS PASSOS RECOMENDADOS

1. Criar tabelas no Supabase (cursos, modulos, aulas, progresso_aluno, agendamentos, clientes, profissionais, servicos)
2. Integrar checkout com Mercado Pago (Pix + cartão)
3. Automação WhatsApp: agendamento → disparo de confirmação via Evolution API
4. Comunidade realtime com Supabase Realtime subscriptions

Validação Final: BUILD APROVADO · TypeScript SEM ERROS · ESLint 0 ERROS
