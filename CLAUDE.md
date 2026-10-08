# Studio & Academy Agnaldo Gomes — Documentação e Diretrizes de Engenharia

> **Guia mestre de arquitetura, padrões de projeto, regras de negócio e histórico de desenvolvimento para assistentes de IA (Claude / Antigravity).**

---

## 1. Visão Geral do Projeto

Plataforma unificada para o **Studio de Beleza & Academy Agnaldo Gomes**, contemplando:
- **Site Institucional & Portfólio**: Apresentação de tratamentos, terapias capilares, transformações e Dia da Noiva.
- **Sistema de Agendamento Online**: Fluxo guiado em passos com seleção de profissional/serviço e cobrança automática de sinal PIX para noivas.
- **Painel de Gestão Administrativa (Studio)**: CRM de clientes, controle de agenda, cadastro de profissionais, serviços, comissões, estoque, notas fiscais e faturamento.
- **Central de Módulos (Command Center / Hub)**: Acesso unificado aos sistemas do salão, loja, cursos e recepção com identificação do usuário logado.
- **Agnaldo Gomes Academy**: Plataforma de cursos para cabeleireiros, módulos, turmas presenciais/VIPs, certificados digitais e videoaulas.
- **Loja de Cosméticos e Equipamentos**: Venda de produtos físicos locais e afiliados Mercado Livre com carrinho persistente em sessão.

### 🛠️ Stack Tecnológica
- **Framework Frontend/Backend**: Next.js 16 (App Router, Server Components & Route Handlers).
- **Linguagem**: TypeScript 5.8 (Strict Mode).
- **Estilização**: TailwindCSS v4 + CSS Glassmorphism + Framer Motion.
- **Banco de Dados & Auth**: Supabase (PostgreSQL com Row Level Security).
- **Clientes Supabase**:
  - `lib/supabase/client.ts`: Cliente universal híbrido (SSR/Node.js e navegador).
  - `lib/supabase-admin.ts`: Cliente com Service Role Key para rotas de servidor e bypass seguro de RLS.
  - `lib/supabase/server.ts`: Cliente com sessão baseada em cookies para Server Components e Route Handlers.
- **CRM Externo**: Bolten.io (Webhooks e REST API v1).
- **Gateways de Pagamento**: Mercado Pago SDK (PIX dinâmico com QR Code e Copia-e-Cola), Stripe e Asaas.
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
- **Leads Externos (`app/api/webhooks/bolten/route.ts`)**: Valida a base interna, confirmando cadastros existentes e inserindo apenas leads inéditos.

### 🛡️ Políticas de RLS & Acesso Server-Side
- Para evitar bloqueios do **Row Level Security (RLS)** no navegador (erro 42501), todas as operações de leitura e escrita administrativa utilizam Route Handlers server-side com `getSupabaseServiceClient()` ou `supabaseAdmin`:
  - `/api/clientes` (GET, POST, DELETE)
  - `/api/servicos` (GET, POST, DELETE)
  - `/api/profissionais` (GET, POST, DELETE)
  - `/api/profissionais/vinculos` (POST)
  - `/api/agendamentos/admin` (GET, POST)
  - `/api/cart` (GET, POST, PATCH, DELETE) — suporte seguro a sessões de visitantes anônimos e clientes logados.

---

## 3. Padrão de Identificadores (UUIDs)

- **Regra Rígida**: NUNCA utilizar IDs sequenciais com zeros (ex: `a0000001-...` ou `b0000001-...`).
- **Padrão Oficial**: Todos os registros usam **UUID v4 criptograficamente aleatório** gerado por `gen_random_uuid()` no Postgres.
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

## 5. Módulo de Marketing & Mensagens WhatsApp

### 💬 Centralização em `lib/mensagens.ts`
- **Fonte Única de Verdade**: Centraliza os templates oficiais de comunicação do Studio.
- **Templates Padrão (`MENSAGENS_PADRAO`)**:
  - `msg_confirmacao`: Confirmação enviada 1 dia antes do agendamento com data, hora, serviço e profissional.
  - `msg_lembrete`: Lembrete enviado no dia do atendimento.
  - `msg_feedback`: Avaliação pós-procedimento enviada 1 dia após o serviço concluído.
  - `msg_aniversario`: Parabéns no dia do aniversário às 08h.
  - `msg_reativacao`: Reengajamento para clientes sem visita há mais de 90 dias.
- **Interpolação de Variáveis**: O helper `aplicarTemplate` aceita tanto a sintaxe `{variavel}` quanto `{{variavel}}`:
  - `{nome}`, `{servico}`, `{profissional}`, `{data}`, `{hora}`, `{tempo}`.
- **Cache Otimizado**: Carregamento de configurações de `salon_system_settings` com cache em memória com TTL de 60 segundos e função `invalidarCacheMensagens()` acionada imediatamente ao salvar no painel.

### 🎨 Painel de Gestão (`/admin/marketing`)
- **Cards de Mensagens Automáticas Padrão**: Visualização em cartões de cada regra com botão de edição rápida, chips clicáveis para inserir variáveis e pré-visualização estilo balão do WhatsApp.
- **Cards de Regras Personalizadas**: Criação, edição e exclusão de regras por serviço, offset de dias (antes ou após) e método de disparo (Automático ou Manual via WhatsApp).
- **Selo de Personalização**: Destaca visualmente no card quando o administrador alterou o texto original do sistema.

---

## 6. Automações & Crons (`app/api/cron/*`)

Todas as rotas de cron utilizam execução assíncrona com `Promise.all` e retornam relatório JSON com links `wa.me` diretos e envio automático via Evolution API (quando conectada):

1. **`/api/cron/agenda`** (Diário 09h BRT):
   - Confirmações de véspera (`D+1`) e lembretes do mesmo dia (`D0`).
2. **`/api/cron/aniversarios`** (Diário 08h BRT):
   - Localiza aniversariantes pelo dia e mês de nascimento e dispara saudações personalizadas.
3. **`/api/cron/feedback`** (Diário 09h BRT):
   - Busca atendimentos concluídos (`COMPLETED`/`CONFIRMED`) de ontem e anteontem solicitando nota e feedback.
4. **`/api/cron/reativacao`** (Mensal / Sob Demanda):
   - Analisa o histórico de atendimentos e lista clientes inativos há 90+ dias com link pronto para retomada.

---

## 7. E-commerce & Loja (`/loja` e `/admin-loja`)

- **Carrinho Persistente (`/api/cart`)**: Gerencia o carrinho do cliente por cookie `cart_session_id` para visitantes ou por `user_id` para usuários autenticados, com operações de `GET`, `POST` (adicionar), `PATCH` (quantidade) e `DELETE` (remover).
- **Zustand Store (`store/cartStore.ts`)**: Hidratação automática do carrinho e cálculo de subtotal/quantidade de itens.
- **Painel Administrativo da Loja (`/admin-loja`)**: Gerenciamento de produtos locais e afiliados do Mercado Livre, pedidos e configurações de entrega.

---

## 8. Agnaldo Gomes Academy

- **Estrutura de Cursos**: Cursos online (`academy_courses`), módulos (`academy_modules`) e aulas (`academy_lessons`).
- **Turmas Presenciais & VIPs**: Gestão de mentorias exclusivas (`academy_vip_courses`) com agenda de turmas e checkout direto.
- **Certificados Digitais**: Geração e verificação pública de certificados com código de validação em `/verificar-certificado`.
- **Área do Aluno (`/aluno/*`)**: Dashboard do estudante, reprodutor de vídeo, comunidade e download de certificados.

---

## 8.1 Gestão da Agenda & Categorias de Profissionais

- **Categorias Oficiais de Profissionais**:
  - `✂️ Cabelo`: Especialistas capilares (cortes, escovas, mechas, coloração, barbearia). Ex: Agnaldo Gomes, Equipe Studio.
  - `💅 Unhas`: Especialistas em manicure, pedicure, esmaltação em gel e podologia. Ex: Camila Silva (Unhas).
- **Filtro Dinâmico na Agenda (`/admin/agenda`)**:
  - **Tabs de Categoria**: Alterna entre "Todos os Atendimentos", "✂️ Cabelo" e "💅 Unhas" com contadores em tempo real.
  - **Cascata Visual**: Ao selecionar uma categoria, a agenda atualiza automaticamente os pills de profissionais, as colunas do Kanban, os horários e bloqueios do dia.
  - **Auto-reset inteligente**: Se um profissional específico estiver selecionado e o usuário alternar para uma categoria à qual ele não pertence, o filtro de profissional volta para "Todos".
  - **Modal de Agendamento**: Exibe os profissionais organizados por `<optgroup label="✂️ Cabelo">` e `<optgroup label="💅 Unhas">` com indicação visual da categoria.
- **Busca Rápida de Clientes**:
  - Campo de pesquisa em tempo real na Agenda e no Modal (busca por nome, telefone ou `#código`).
  - Cadastro rápido de novos clientes inline diretamente na criação do agendamento.

---

## 8.2 Gestão de Comissões, Fechamento Semanal & Regra D+30 de Cartão

- **Regra Oficial de Repasse de Cartão de Crédito (D+30)**:
  - Comissões provenientes de pagamentos em **Cartão de Crédito** têm carência e são liberadas **30 dias após o recebimento/atendimento** (`due_date = data + 30 dias`).
  - Atendimentos em **Dinheiro, PIX e Débito** são de liberação **imediata**, entrando diretamente no fechamento da semana em que foram realizados.
- **Fechamento de Caixa Semanal de Comissões (`/admin/comissoes?aba=fechamento`)**:
  - Navegador dinâmico de semanas (Segunda a Domingo).
  - Discrimina por profissional: Produção Bruta, Comissões Liberadas na Semana (Imediato da semana + Crédito D+30 maduro), e Comissões Retidas em Carência (Crédito D+30 futuro).
  - Ação em 1 clique para **Dar Baixa / Fechar Semana** via `pagarLoteParcelas()`.
  - **Extrato / Recibo Semanal**: Modal com layout timbrado para conferência, botão de impressão/PDF (`window.print()`) e botão de **Copiar para WhatsApp** com texto formatado.
- **Consulta de Recebíveis por Período (`/admin/comissoes?aba=recebiveis`)**:
  - Filtro flexível por atalhos (Esta Semana, Semana Passada, Próxima Semana, Este Mês, Mês Passado, Personalizado).
  - Filtros avançados por profissional, forma de pagamento e status (Liberados, Carência D+30, Já Quitados).
  - Indicadores em tempo real de dias restantes para liberação de vendas em crédito.
- **Painel do Profissional (`/admin/meu-painel`)**:
  - Cards de acesso rápido para consulta de recebíveis e fechamento semanal.

---

## 8.3 Descontos em Atendimentos e Vendas de Produtos de Salão

- **Fechamento de Atendimento com Desconto (`/admin/agenda`)**:
  - Ao concluir um agendamento e receber o pagamento, a recepção/administração pode aplicar desconto geral ao cliente.
  - **Sincronização Bidirecional Automática (% e R$)**:
    - Ao digitar a **porcentagem (%)**, o sistema calcula e preenche automaticamente o **valor em Reais (R$)** com base no subtotal.
    - Ao digitar o **valor em Reais (R$)**, o sistema calcula e preenche automaticamente a **porcentagem correspondente (%)**.
    - Atalhos de um clique: `0% (Sem desc.)`, `5%`, `10%`, `15%`, `20%`, `25%`, `30%`.
    - Campo opcional para motivo/observação do desconto (ex: "Aniversariante", "Cortesia VIP", "Parceria").
  - **Venda de Produtos no Checkout**:
    - Permite incluir produtos do salão diretamente no fechamento, com desconto individual por item (% e R$ sincronizados).
  - **Cálculo Líquido e Repasse de Comissões**:
    - O valor total recebido (`Total Líquido a Receber`) deduz o desconto com clareza no resumo financeiro.
    - O repasse de comissão do profissional é calculado fielmente sobre o valor líquido recebido, mantendo a integridade financeira do salão.

- **Venda Direta de Produtos no Salão / Balcão (`/admin/estoque`)**:
  - Botão **"Venda no Salão"** no cabeçalho e botão **"Vender"** nos cards de produtos disponíveis para revenda.
  - **Carrinho com Múltiplos Produtos (PDV Balcão)**:
    - Permite selecionar múltiplos produtos diferentes (ex: Shampoo + Condicionador + Máscara + Óleo).
    - Permite ajustar a quantidade de cada item com botões rápidos `[-]` e `[+]` e preço unitário avulso.
    - O sistema soma automaticamente os subtotais de todos os produtos selecionados.
    - Botão de remoção individual de itens.
  - **Desconto Geral no Total da Venda (% <-> R$ Sincronizados)**:
    - Aplicado sobre o somatório geral de todos os produtos do carrinho.
    - Sincronização bidirecional instantânea: digitando `%` calcula `R$`, digitando `R$` calcula `%`.
    - Atalhos de um clique: `0%`, `5%`, `10%`, `15%`, `20%`, `25%`, `30%`.
    - Se novos produtos forem adicionados ou removidos do carrinho, o desconto em % recalcula e ajusta os valores automaticamente.
  - Associação opcional de cliente cadastrado e profissional vendedor (gerando comissão calculada sobre o valor líquido final).
  - Formas de pagamento: Dinheiro, PIX, Débito e Crédito (com parcelamento de 1x a 12x).
  - Baixa automática no estoque (`OUT_SALE`) para cada produto vendido com histórico detalhado nas movimentações.

- **Lançamento de Produtos pelo Profissional (`/admin/meu-painel`)**:
  - No modal de Upsell da cadeira, o profissional pode conceder desconto em % ou R$ (com cálculo automático) ao lançar o produto na comanda do cliente.

---

## 9. Comandos Úteis de Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar ambiente local com Next.js
npm run dev

# Validação estrita de TypeScript (auditoria de tipos)
npx tsc --noEmit

# Build de produção
npm run build

# Enviar atualizações para o repositório oficial
git add .
git commit -m "tipo: descrição clara da alteração"
git push origin main
```
