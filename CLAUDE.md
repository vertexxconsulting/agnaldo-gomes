# Studio & Academy Agnaldo Gomes — Documentação e Diretrizes de Engenharia

> **Guia mestre de arquitetura, padrões de projeto, regras de negócio e histórico de desenvolvimento para assistentes de IA (Claude / Antigravity).**

---

## 1. Visão Geral do Projeto

Plataforma unificada para o **Studio de Beleza & Academy Agnaldo Gomes**, contemplando:
- **Site Institucional & Portfólio**: Apresentação de tratamentos, terapias capilares, transformações e Dia da Noiva.
- **Sistema de Agendamento Online**: Fluxo guiado em 5 passos com cobrança automática de sinal PIX para noivas.
- **Painel de Gestão Administrativa**: CRM de clientes, controle de agenda, cadastro de profissionais, serviços e faturamento.
- **Agnaldo Gomes Academy**: Plataforma de cursos para cabeleireiros, módulos e videoaulas com Vimeo integrado.
- **Loja de Cosméticos e Equipamentos**: Venda de produtos físicos locais e afiliados Mercado Livre.

### 🛠️ Stack Tecnológica
- **Framework Frontend/Backend**: Next.js 15 (App Router, Server Components & Route Handlers).
- **Linguagem**: TypeScript (Strict Mode).
- **Estilização**: TailwindCSS + CSS Glassmorphism + Framer Motion.
- **Banco de Dados & Auth**: Supabase (PostgreSQL com Row Level Security).
- **CRM Externo**: Bolten.io (Webhooks e REST API v1).
- **Gateway de Pagamento**: Mercado Pago SDK (PIX dinâmico com QR Code e Copia-e-Cola).
- **Hospedagem & CI/CD**: Vercel.
- **Repositório Oficial**: `vertexxconsulting/agnaldo-gomes` (branch `main`).

---

## 2. Arquitetura do CRM & Banco de Dados (Sistema Mãe)

### 🏛️ Princípio Fundamental: CRM Interno como Single Source of Truth
O banco de dados PostgreSQL no Supabase (`salon_customers`) é o **SISTEMA MÃE**. Todo dado de cliente, agendamento ou serviço pertence primariamente a ele. O CRM externo (Bolten.io) opera como sistema downstream (espelho desacoplado).

```
┌─────────────────────────────────────────────────────────────┐
│                 SISTEMA MÃE (Single Source of Truth)        │
│                Supabase: tabela salon_customers             │
└───────────────┬─────────────────────────────▲───────────────┘
                │                             │
       (Salva Primeiro)               (Confirma/Atualiza)
                │                             │
    ┌───────────▼───────────┐     ┌───────────┴───────────┐
    │  Painel / Agendamento │     │  Webhook Bolten / CRM │
    │   Site / Recepção     │     │      (Vindo de Fora)  │
    └───────────┬───────────┘     └───────────────────────┘
                │ (Notificação Assíncrona em Background)
                ▼
    ┌───────────────────────┐
    │  CRM Externo (Bolten) │
    │  (Espelho / Notifica) │
    └───────────────────────┘
```

### 🔑 Módulo Central: `lib/crm-sync.ts`
- **Prevenção de Duplicação**: Função `upsertClienteMae()` normaliza o telefone (apenas números) e e-mail antes de qualquer gravação.
- **Idempotência**: Se o cliente já existe por telefone ou e-mail, seus dados são atualizados mantendo o mesmo `id` (UUID v4).
- **Desacoplamento**: O salvamento no sistema mãe nunca é travado caso o CRM externo esteja offline ou sem chave configurada.
- **Leads Externos (`app/api/webhooks/bolten/route.ts`)**: Quando eventos chegam do Bolten ou formulários externos, o sistema valida a base interna, confirmando cadastros existentes e inserindo apenas leads inéditos.

### 🛡️ Políticas de RLS & Acesso Server-Side
- Para evitar bloqueios do **Row Level Security (RLS)** no navegador (erro 42501), todas as operações de leitura e escrita administrativa utilizam Route Handlers server-side com `getSupabaseServiceClient()` (`service_role`):
  - `/api/clientes` (GET, POST, DELETE)
  - `/api/servicos` (GET, POST, DELETE)
  - `/api/profissionais` (GET, POST, DELETE)
  - `/api/profissionais/vinculos` (POST)
  - `/api/agendamentos/admin` (GET, POST)

---

## 3. Padrão de Identificadores (UUIDs)

- **Regra Rígida**: NUNCA utilizar IDs sequenciais com zeros (ex: `a0000001-...` ou `b0000001-...`).
- **Padrão Oficial**: Todos os registros usam **UUID v4 criptograficamente aleatório** gerado por `gen_random_uuid()` no Postgres ou funções UUID seguras.
- **Identificadores Base**:
  - **Agnaldo Gomes**: `e47b1a20-8d3f-4e92-91bc-3a817452d901`
  - **Equipe Studio**: `f82c4d31-9a5e-4b73-82cd-4b928563e012`
- **Script de Migração**: [`seed_atualizar_para_uuids_reais.sql`](./seed_atualizar_para_uuids_reais.sql).

---

## 4. Regras de Negócio e Tabela Oficial de Serviços

Todos os valores exibidos e cadastrados utilizam a premissa de **"Tudo sempre a partir de"**:

| Categoria | Serviço | Duração | Preço Base | Profissional |
| :--- | :--- | :--- | :--- | :--- |
| **Cortes** | Corte Masculino (Equipe) | 30 min | R$ 50,00 | Equipe |
| **Cortes** | Corte Masculino (Agnaldo Gomes) | 35 min | R$ 60,00 | Agnaldo Gomes |
| **Cortes** | Corte Feminino | 45 min | R$ 140,00 | Ambos |
| **Cortes** | Corte Feminino com Escova | 60 min | R$ 160,00 | Ambos |
| **Cortes** | Escova | 30 min | R$ 45,00 | Equipe |
| **Cortes** | Penteado | 60 min | R$ 140,00 | Ambos |
| **Coloração** | Mechas (faixa R$ 480 a R$ 1.080) | 180 min | R$ 480,00 | Agnaldo Gomes |
| **Coloração** | Coloração (faixa R$ 160 a R$ 580) | 90 min | R$ 160,00 | Agnaldo Gomes |
| **Tratamentos** | Hidratação | 40 min | R$ 95,00 | Equipe |
| **Tratamentos** | Selamento Térmico | 60 min | R$ 120,00 | Equipe |
| **Tratamentos** | Reconstrução | 50 min | R$ 120,00 | Equipe |
| **Tratamentos** | Ozônio Terapia | 50 min | R$ 160,00 | Equipe |
| **Tratamentos** | Micro Mist Terapia Capilar | 60 min | R$ 180,00 | Ambos |
| **Tratamentos** | Terapia Capilar Personalizada (R$ 190 a R$ 420) | 60 min | R$ 190,00 | Ambos |
| **Barbearia** | Barba | 30 min | R$ 45,00 | Equipe |
| **Estética Facial** | Sobrancelha | 20 min | R$ 55,00 | Equipe |
| **Maquiagem** | Maquiagem | 60 min | R$ 160,00 | Equipe |
| **Estética Facial** | Limpeza de Pele (Sob consulta) | 60 min | R$ 120,00 | Equipe |
| **Unhas** | Mão | 40 min | R$ 40,00 | Equipe |
| **Unhas** | Pé | 45 min | R$ 45,00 | Equipe |
| **Podologia** | Podologia | 60 min | R$ 90,00 | Equipe |
| **Estética Corporal**| Drenagem Linfática | 60 min | R$ 180,00 | Equipe |
| **Noivas** | Noivas — Cabelo e Make (sem teste) | 180 min | R$ 980,00 | Agnaldo Gomes |
| **Noivas** | Noivas — Completo com Dia da Noiva | 360 min | R$ 2.499,00 | Agnaldo Gomes |

### 💍 Regra do Dia da Noiva
- Serviços de Noiva exigem **cobrança obrigatória de 50% de sinal via PIX** para bloqueio e garantia da data na agenda.

---

## 5. Fluxo de Agendamento Inteligente

1. **Inversão da Lógica**:
   - Passo 1: Identificação (WhatsApp / CRM Mãe).
   - Passo 2: **Escolha do Profissional** (Agnaldo Gomes ou Equipe Studio).
   - Passo 3: **Seleção de Serviço**: O seletor filtra dinamicamente exibindo **apenas os procedimentos habilitados para o profissional escolhido**.
   - Passo 4: **Data e Horário**: Cruzamento de horários disponíveis.
   - Passo 5: Confirmação e Pagamento de Sinal (quando aplicável).

2. **Separação de Horários Salão vs. Profissional**:
   - **Salão**: Terça a Sexta (09:00 às 19:00), Sábado (08:00 às 17:00), Domingo e Segunda (Fechado).
   - **Profissional**: Cada profissional possui sua jornada semanal individual configurada no banco (`weekly_schedule`).
   - A grade cruza a abertura do salão com a jornada do profissional e desabilita slots já agendados ou com bloqueio de horário.

---

## 6. Integrações & Variáveis de Ambiente

### Bolten.io CRM
- Gerenciado via variáveis de ambiente da Vercel (sem formulários complexos no painel).
- Variáveis:
  - `BOLTEN_API_KEY`: Bearer token da API Bolten.
  - `BOLTEN_PROJECT_ID`: ID do projeto no Bolten.
  - `BOLTEN_KANBAN_COMPONENT_ID`: Componente do funil/Kanban de agendamentos.
  - `BOLTEN_CONTACT_COMPONENT_ID`: Componente de contatos.
  - `BOLTEN_WEBHOOK_KEY`: Token de autenticação do webhook.
  - `BOLTEN_WEBHOOK_URL`: URL do webhook para notificações instantâneas.

### WhatsApp
- Totalmente baseado na API de links diretos `wa.me` com mensagens personalizadas pré-formatadas.
- A biblioteca Evolution API foi **completamente removida** do projeto.

---

## 7. Módulo de Relatórios & Exportação (PDF e SVG)

- **Filtros Temporais Inteligentes**: Consulta por Dia específico, Mês Atual, Mês Anterior, Ano Atual, Ano Anterior, Mês Específico e Histórico Total.
- **Exportação para PDF (`lib/export-reports.ts`)**: Gera documento A4 formatado com cabeçalho oficial do Studio Agnaldo Gomes, cartões de KPIs (Faturamento, Atendimentos, Ticket Médio, Cancelamentos), tabelas de serviços e profissionais, além de histórico detalhado de clientes com paginação automática.
- **Exportação para SVG Vetorial (`lib/export-reports.ts`)**: Renderiza infográfico vetorial completo com gradientes dourados `#D4AF37` e visual glassmorphism em alta resolução para apresentações e compartilhamento instantâneo.

---

## 8. Módulo da IA Assistente (`/admin/ia-assistente`)

- **Controle Administrativo Restrito**: Acesso exclusivo para o administrador gerenciar o comportamento e automações da IA.
- **Master Switch**: Ativação e desativação em tempo real com indicador visual de status.
- **Relatórios Automáticos para o Agnaldo via Cron & Bolten.io**: Configuração de envio periódico automatizado via Vercel Cron (`/api/cron/relatorio-ia`, agendado diariamente às 20h BRT) integrado diretamente com o Bolten.io CRM e WhatsApp (`wa.me`). Inclui botão no painel para disparo manual imediato.
- **Separação por Sistemas de Gestão**:
  - **Salão (Studio)**: Agendamentos, jornada dos profissionais, intervalos e contratos de noivas.
  - **Loja (Store)**: Estoque local de cosméticos e links de afiliados oficiais do Mercado Livre.
  - **Academy (Cursos)**: Regras de videoaulas no Vimeo, certificação e suporte a alunos.
- **Horários de Atendimento do Salão 100% Editáveis**: Editor visual de abertura/fechamento (Domingo a Sábado) com horários de início e fim que atualizam a IA, o agendamento público e a agenda administrativa em tempo real.
- **Simulador Interativo (Playground)**: Chat interno para testar respostas e simular cenários antes de colocar em prática.

---

## 9. Comandos Úteis

```bash
# Instalar dependências
npm install

# Executar ambiente local
npm run dev

# Validação estrita de TypeScript
npx tsc --noEmit

# Build de produção
npm run build

# Enviar atualizações para o GitHub da Vertex
git add .
git commit -m "tipo: descrição clara da alteração"
git push vertexx main
```
