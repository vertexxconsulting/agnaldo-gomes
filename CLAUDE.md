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
- **Script de Migração**: [`sql_scripts/05_seeds/seed_atualizar_para_uuids_reais.sql`](./sql_scripts/05_seeds/seed_atualizar_para_uuids_reais.sql).

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

## 8.4 Vínculo Estrito de Procedimentos por Profissional no Agendamento

- **Regra de Segurança da Agenda (`/agendamento` e `/admin/agenda`)**:
  - Ao selecionar o profissional, o sistema consulta a tabela `salon_professional_services` e exibe **apenas e exclusivamente os procedimentos vinculados àquele profissional**.
  - **Eliminação de Fallback Genérico**: foi extinto o comportamento anterior que retornava todos os serviços do salão caso não houvesse filtro prévio. Manicures (ex: Gabriella e Lohayne) realizam exclusivamente procedimentos de Unhas; Cabeleireiros e auxiliares realizam apenas procedimentos capilares/barba/tratamentos autorizados.
  - **Interface do Cliente (`/agendamento`)**:
    - Passo 3 lista somente procedimentos do profissional selecionado, com contador dinâmico de opções.
    - Barra de busca instantânea e filtro por categorias (ex: Unhas, Cortes, Tratamentos, Coloração).
    - Estado vazio inteligente: alerta amigável e botão de troca de profissional caso o profissional selecionado não possua procedimentos cadastrados.
    - Troca de profissional limpa automaticamente qualquer procedimento pré-selecionado para impedir agendamentos cruzados inválidos.
  - **Agenda Administrativa (`/admin/agenda`)**:
    - O dropdown de seleção de procedimentos carrega estritamente os procedimentos autorizados para o profissional escolhido, evitando erros operacionais da recepção.

---

## 8.5 Reconhecimento do WhatsApp do Salão e Resiliência no Agendamento

- **Reconhecimento Dinâmico do Número do Salão (`loja_settings` & `salon_system_settings`)**:
  - O sistema agora puxa dinamicamente o número oficial cadastrado para o salão em `loja_settings.whatsapp_contato` (configurado em `/admin/sistema` no bloco "WhatsApp de Atendimento do Salão") e `salon_system_settings`.
  - **Normalização Automática para `wa.me` (`lib/whatsapp.ts`)**:
    - Função `normalizarTelefoneDestino()` higieniza qualquer formatação brasileira (com ou sem DDI 55, parênteses ou traços, ex: `(42) 99827-1222` ou `42998271222`) convertendo estritamente para o padrão internacional com DDI 55 (`5542998271222`).
    - Elimina erros do WhatsApp do tipo *"O número compartilhado por link é inválido"*.
  - **Permissividade da API de Agendamento (`/api/agendamento`)**:
    - `validateOrigin`: ampliada para aceitar origens legítimas (`agnaldogomes.com`, `agnaldogomes.com.br`, `vercel.app`, `localhost`, `127.0.0.1` e requisições diretas de webview/mobile sem cabeçalho).
    - `validatePhone`: normaliza números enviados pelo cliente que contenham DDI 55 antes de validar os 10 ou 11 dígitos, evitando falso erro de *"Telefone inválido"*.
  - **Fallback Gracioso no Front-end (`/agendamento`)**:
    - Se houver qualquer instabilidade momentânea na gravação do banco de dados, o cliente recebe um alerta amigável e a opção direta de enviar a mensagem com todos os dados montados para o WhatsApp oficial do salão, garantindo que nenhum lead ou agendamento seja perdido.
    - Teste direto de link WhatsApp adicionado em `/admin/sistema` para conferência imediata da recepção.

---

## 8.6 Sistema de Login por Nickname / Apelido

- **Login Híbrido (E-mail ou Nickname)**:
  - O componente global de login (`components/SplitLogin.tsx`) agora aceita tanto o e-mail tradicional quanto um apelido/nickname (ex: `agnaldo`, `alice`, `anderson`, `secretaria`, `admin`).
  - **Resolução Automática (`/api/auth/resolve-identifier` & `lib/nicknames.ts`)**:
    - Se o usuário digita um valor sem `@`, o sistema consulta em camadas:
      1. Tabela `salon_system_settings` (`key: 'user_nicknames'`).
      2. Tabela `profiles` (campo `permissions.nickname`, primeiro nome ou nome completo sem espaços).
      3. Metadados do Auth (`user_metadata.nickname`).
      4. Tabela `salon_professionals` (equipe do salão).
    - O identificador é resolvido para o e-mail real e autenticado no Supabase Auth via `supabase.auth.signInWithPassword()`.
    - **Preservação Total**: Nenhuma senha foi alterada e os papéis/permissões (`Role`) continuam 100% preservados.
  - **Gestão no Painel (`/admin/equipe` e `/admin/perfil`)**:
    - A tabela de membros em `/admin/equipe` exibe uma coluna dedicada mostrando o `@nickname` do usuário.
    - O modal de "Novo Membro" permite definir um apelido opcional na criação.
    - O modal de "Editar" permite alterar ou cadastrar o `@nickname` de qualquer membro da equipe através de `/api/admin/nicknames` sem travar a auto-edição de administradores.
    - A página de Perfil (`/admin/perfil`) carrega o apelido do usuário e sincroniza alterações em segundo plano via `POST /api/admin/nicknames` e na tabela `profiles`.
    - O Perfil exibe dinamicamente o Cargo/Role real do usuário formatado através de `ROLE_LABELS` (ex: Administrador do Sistema, Secretária, etc.), eliminando rotulações estáticas.

---

## 8.7 Design System, Tokens Semânticos & Estilização Dark Premium

- **Paleta de Cores e Tokens CSS**:
  - `background`: `#0a0a0a` (lacquer-black / preto profundo acolhedor).
  - `surface`: `#1a1a1a` com bordas sutis em `#2a2a2a` (`var(--color-border)`).
  - `primary`: `#c9a84c` (kinpaku gold / ouro refinado para ações e destaques).
  - `secondary`: `#5a9e8a` (verdigris patina / verde suave para elementos secundários).
  - `text`: `#f0f0f0` (champagne / contraste harmonioso sem cansaço visual).
  - Estados semânticos: `success` (`#4a9e6a`), `info` (`#3a7ab5`), `error` (`#c0392b`).
- **Aplicação no Painel Administrativo (`/admin`)**:
  - Atalhos rápidos, painéis de Kanban e cards da recepção convertidos para utilizar as variáveis de tokens semânticos (`var(--color-background)`, `var(--color-surface)`, `var(--color-border)`, `text-primary`, `bg-success`).
  - Banimento de cores neon ou gradientes genéricos em favor de estética visual limpa, contrastante e alinhada à sofisticação do Studio.

---

## 8.8 Otimizações na Agenda, Pagamentos e Gestão de Profissionais

- **Atualização Otimista & Cache Global na Agenda (`/admin/agenda`)**:
  - Cache de serviços em array global para carregamento instantâneo.
  - Atualização otimista (optimistic UI update) para subserviços e alteração de status, proporcionando fluidez sem travamentos na recepção.
- **Auditoria e Filtro de Pagamentos por `created_at` (`/admin/pagamentos`)**:
  - Unificação de filtros de período e consultas financeiras com base no timestamp real `created_at`.
  - Elimina discrepâncias de timezone e ordenação imprecisa entre o Supabase e o navegador.
- **Feedback Moderno e Resiliência em Profissionais (`/admin/profissionais`)**:
  - Substituição de `alert()` do navegador por notificações interativas via `sonner` (`toast.success`, `toast.error`, `toast.warning`).
  - Validação defensiva com optional chaining em arrays de especialidades (`prof.especialidades?.some(...)`), prevenindo quebras em cadastros parciais.

---

## 8.9 Consolidação de Migrações e Scripts SQL

- **Local Oficial: `sql_scripts/`**:
  - Toda a arquitetura de banco de dados do Supabase é mantida exclusivamente sob o diretório `sql_scripts/`:
    - `01_core/`: Esquema base, profiles, RLS, storage, notificações, logs de auditoria e configurações.
    - `02_studio/`: Regras de agenda, clientes fixos, comandas, comissões, serviços e Dia da Noiva.
    - `03_academy/`: Cursos, aulas, certificados e comunidade.
    - `04_loja/`: Estoque, carrinho, cupons, frete e fidelidade.
    - `05_seeds/`: UUIDs v4 criptográficos e carga inicial de serviços.
  - Diretórios legados duplicados fora da estrutura oficial foram saneados para evitar conflitos de versão.

---

## 8.10 Comanda Unificada Multi-Profissional & Extrato Discriminado da Gestão

- **Fluxo Integrado de Múltiplos Profissionais**:
  - Resolução completa para o fluxo real do salão onde uma mesma cliente é atendida por 2 ou mais profissionais no mesmo dia (ex: mechas/raiz com colorista e escova/finalização com assistente/escovista).
  - Agrupamento automático de agendamentos da mesma cliente no dia ao abrir o fechamento de comanda.
  - Permite adicionar procedimentos extras vinculando cada um ao respectivo profissional executor.
  - Registro de insumos e produtos utilizados por etapa/serviço.
  - Desconto individualizado por procedimento (em % ou R$) concedido pelo próprio profissional executor.
- **Extrato Discriminado e Auditoria da Gestora (`/admin/pagamentos`)**:
  - Eliminação de duplicidade de valores e faturamento duplo nos relatórios financeiros (`getValorEfetivo`).
  - Badges visuais indicando "Comanda Multi-Profissional" e "Integrado na Comanda".
  - Modal de "Extrato Discriminado do Atendimento" para visualização completa de cada procedimento, executor, produtos consumidos, descontos concedidos e comprovante imprimível.
  - Liquidação e sincronização automática de agendamentos secundários vinculados no Supabase via `confirmarFechamentoGestao`.

---

## 8.11 Layout Expandido dos Modais de Fechamento (2 Colunas & Zero Scroll Lateral)

- **Redesenho do Modal de Fechamento (`CheckoutModal.tsx` e `/admin/agenda`)**:
  - Ampliação da largura útil dos modais de checkout de `max-w-xl` / `max-w-2xl` para `max-w-5xl xl:max-w-6xl`.
  - Distribuição em 2 colunas responsivas no desktop (`lg:grid-cols-12`):
    - **Coluna Esquerda (`col-span-7`)**: Lista discriminada de procedimentos, seleção de executores, insumos aplicados e descontos individuais.
    - **Coluna Direita (`col-span-5`)**: Formas de pagamento, cálculo de troco/divisões, gorjetas, acréscimos e botão de finalização destacado.
  - Eliminação estrita de scroll lateral (`overflow-x-hidden`) com scroll vertical ergonômico (`max-h-[82vh] overflow-y-auto`), evitando cortes visuais em telas de recepção e notebooks.

---

## 8.12 Periodicidade Flexível de Comissões (Semanal, Quinzenal e Mensal)

- **Ciclos de Repasse Personalizados**:
  - Suporte à periodicidade de pagamento de comissões nos formatos **Semanal** (padrão), **Quinzenal** e **Mensal**.
  - Configuração disponível tanto no gerenciamento administrativo de profissionais (`/admin/profissionais` e `/admin/comissoes`) quanto pelo próprio profissional em seu painel pessoal (`/admin/meu-painel`).
  - Persistência e sincronização de metadados via endpoint `/api/profissionais`.

---

## 8.13 Endereço Estruturado no CRM e Melhorias de Usabilidade da Recepção

- **Endereço Estruturado no CRM (`/admin/clientes`)**:
  - Campos atômicos para **Rua**, **Número**, **Bairro** e **Cidade**, facilitando preenchimento, relatórios e futuras integrações logísticas.
- **Sidebar Expansível por Hover (`AdminSidebar.tsx` e Layout)**:
  - Quando a barra lateral estiver recolhida para economizar espaço de tela, passar o mouse (`onMouseEnter` / `onMouseLeave`) expande-a suavemente sem perder o estado base fixo.
- **Diferenciação Visual na Agenda (`/admin/agenda`)**:
  - Alternância de tonalidades nos cards de agendamento de clientes intercalados, permitindo à recepção diferenciar atendimentos consecutivos com rapidez.
  - Fixação dos botões operacionais rápidos da secretária: *Iniciar Atendimento*, *Cancelar* e *Faltou*.

---

## 8.14 Refinamento Cromático: Eliminação do Roxo com Dourado e Alto Contraste de Verdes

- **Eliminação de Roxo com Dourado (Aberração Cromática e Baixo Contraste)**:
  - Substituição de fundos roxos (`bg-purple-50` / `bg-purple-950/20`) combinados com tipografia dourada (`text-gold`) por containers neutros de alta sofisticação (`bg-foreground/[0.03]` com bordas `border-[var(--border-subtle)]`).
  - Destaques, ações primárias e identificadores de auxiliares/etapas unificados com a paleta oficial Studio Agnaldo Gomes (`bg-gold`, `text-gold` e `border-gold/30`), garantindo leitura 100% nítida em qualquer dispositivo.
- **Padrão de Alto Contraste para Textos e Badges Verdes**:
  - Eliminação de verdes pastéis esmaecidos (`text-emerald-300` / `text-emerald-400` puros) sobre fundos claros que violavam critérios de acessibilidade WCAG.
  - No tema claro (`--background: #faf8f3`), aplicação sistemática de verdes profundos legíveis (`text-emerald-800`, `text-emerald-900`, `text-emerald-950` e caixas informativas em `bg-emerald-100/90 border-emerald-300`).
---

## 8.15 Ocultação Sistemática de Produtos sem Saldo em Estoque (Fechamento, Comanda, Balcão e Vitrine)

- **Regra de Negócio Rígida**:
  - Nenhum produto com saldo em estoque zerado ou negativo (`stock_qty <= 0` ou `stock_quantity <= 0`) pode ser exibido para venda ou seleção em qualquer ponto do sistema.
  - O produto é automaticamente ocultado de todas as listagens de venda e só volta a ficar visível quando for registrada uma nova entrada com saldo positivo no estoque.
- **Pontos Cobertos**:
  1. **Modal de Fechamento / Checkout (`components/CheckoutModal.tsx` e `app/admin/agenda/page.tsx`)**:
     - Seletor "Adicionar produto da prateleira..." e insumos de checkout filtram apenas produtos ativos com `allow_sale` e `stock_qty > 0`.
     - Trava de validação na inclusão para impedir adição manual de itens zerados e bloqueio de quantidade superior ao estoque disponível.
  2. **Comanda do Profissional (`app/admin/meu-painel/page.tsx`)**:
     - Seletores de insumos de procedimento e upsell de venda filtram produtos com saldo `> 0`.
     - Validação estrita na função `handleSalvarProduto` bloqueando qualquer lançamento de produtos esgotados.
  3. **Venda de Balcão e Catálogo de Estoque (`app/admin/estoque/page.tsx`)**:
     - Botão "Vender" só é renderizado em cards com saldo positivo `stock_qty > 0`.
     - O seletor do modal "Venda de Produtos no Salão (Balcão)" exibe apenas itens com saldo positivo.
  4. **Vitrine da Loja Online (`lib/shop-queries.ts`, `app/(shop)/loja/page.tsx`, `categoria/[slug]/page.tsx`, `p/[id]/page.tsx`)**:
     - Listagens de produtos, destaques, categorias e mais vendidos ocultam produtos locais (`LOCAL_STOCK`) que estejam com `stock_quantity <= 0` (mantendo produtos `AFFILIATE_ML` que operam via links externos).
     - Validação defensiva no carrinho e na tela de detalhes do produto bloqueando adição se esgotado.

---

## 8.16 Expansão Lateral Completa e Design Compacto dos Cards e Textos

- **Aproveitamento Total da Largura (Eliminação de Margens Artificiais)**:
  - No layout administrativo mestre (`app/admin/layout.tsx`), remoção da trava restritiva de `max-w-6xl` que criava espaços vazios laterais indesejados. O conteúdo agora ocupa elegantemente a largura total (`w-full max-w-none px-3 sm:px-5 lg:px-6`).
  - Remoção de containers rígidos (`container mx-auto px-6`) nas abas de Estoque, Serviços, Profissionais e Comissões, padronizando a largura total fluida em todas as seções.
- **Compactação Proporcional de Cards, Textos e Ações**:
  - **`Panel` e `StatCard` (`components/ui/Panel.tsx`)**: Padding reduzido para `p-3 sm:p-3.5`, valores numéricos ajustados de `text-2xl` para `text-lg sm:text-xl font-bold`, ícones discretos e labels enxutas em `text-[10px]`.
  - **Dashboard da Recepção (`app/admin/page.tsx`)**:
    - Botões de atalhos rápidos compactados horizontalmente com padding `py-2.5 px-3` e ícones `size={16}`.
    - Cards de atendimento ("Na Cadeira Agora" e "Aguardando Caixa") com tipografia proporcional (`text-sm sm:text-base` para nomes de clientes, `text-xs` para serviços e botões otimizados em `text-xs py-1.5 px-3`).
    - Lista "Próximos a Chegar" condensada em `py-2 px-2.5` com botões "Chegou" em altura reduzida (`h-6`).
  - **`CardGlass` (`components/CardGlass.tsx`)**: Padding padrão reduzido de `p-8` / `p-5` para `p-4 sm:p-5` / `p-3 sm:p-3.5` em modo compacto.

---

## 8.17 Regras de Comissão Agrupadas por Profissional (Expandir/Recolher)

- **Eliminação da Lista Misturada (`app/admin/comissoes/page.tsx` - Aba "Regras de Comissão")**:
  - As centenas de regras por serviço foram organizadas em cartões expansíveis individuais (sanfona/accordion) para cada profissional da equipe.
  - Cada card exibe avatar, nome do profissional, especialidade, percentual geral e quantidade de procedimentos configurados.
- **Visualização Clara e Ajustes Precisos**:
  - Ao expandir o profissional, é exibida sua tabela dedicada de serviços com:
    - Procedimento e categoria.
    - Preço base do serviço de tabela.
    - Percentual de comissão aplicada (ex: `40%`).
    - Repasse estimado em reais (ex: `R$ 192,00`), permitindo ao gestor visualizar o impacto financeiro exato de cada regra.
    - Botão de edição direta da comissão e exclusão.
  - Botão de ação rápida `+ Adicionar Serviço` diretamente no cabeçalho ou rodapé de cada profissional.
- **Navegação Produtiva e Busca Rápida**:
  - Botões para "Expandir Todos" e "Recolher Todos" em um único clique.
  - Barra de busca instantânea que filtra por nome do profissional ou por nome do serviço (expandindo automaticamente os resultados correspondentes).
  - Filtro por profissional integrado que foca e abre a sanfona do profissional selecionado.

### 8.18 Correção de Contraste e Legibilidade de Cores (Tailwind v4 e Badges)
- **Declaração Explícita de `@custom-variant dark (&:where(.dark, .dark *))`**:
  - No Tailwind CSS v4, o seletor `dark:` por padrão utiliza media query de sistema (`prefers-color-scheme: dark`). Quando o sistema operacional do usuário está em modo escuro, as classes `dark:` eram acionadas mesmo com a aplicação no tema padrão claro (`#faf8f3`), causando textos claros (lavanda pastel `text-purple-200`, `text-emerald-400`, etc.) sobre fundos claros. A inclusão da diretiva `@custom-variant dark` garante que variantes dark só se apliquem quando a classe `.dark` estiver presente.
- **Tabela de Atendimentos e Fechamento (`/admin/pagamentos`)**:
  - **Pills de Auxiliares**: estilizados com `bg-purple-100 text-purple-950 border border-purple-300 font-bold`, garantindo contraste AAA sobre o fundo do card.
  - **Status de Atendimento**: tags com fundo, borda e texto de alto contraste (`bg-emerald-100 text-emerald-900 border-emerald-300` para Concluído; `bg-amber-100 text-amber-950 border-amber-300` para Confirmado/Agendado; `bg-red-100 text-red-900 border-red-300` para Cancelado; `bg-blue-100 text-blue-900 border-blue-300` para Em Atendimento).
  - **Formas Declaradas**: badges com tipografia nítida e cores sólidas (Dinheiro, PIX, Crédito, Débito e "Aguardando" legível em `text-stone-500 font-medium`).
  - **Coluna Valor**: valores não-confirmados renderizados em `text-stone-900 font-black` (ou `text-amber-800` quando pré-fechados pela secretaria), removendo o amarelo/laranja lavado sobre o fundo claro.
  - **Status Financeiro**: badges "Pré-fechado (Secretaria)" e "Contabilizado" com cores ricas e tipografia em negrito legível.
- **Modais de Extrato, Insumos por Grama e Checkout da Agenda**:
  - Revisão de todos os indicadores de desconto, insumos, taxas e totais para tons profundos (`text-amber-800`, `text-emerald-700`, `text-teal-800`), eliminando texto esmaecido.

---

## 8.19 Redesenho Executivo de Gráficos e Distribuição de Serviços (`/admin/relatorios`)

- **Eliminação de Sobreposição e Poluição Visual**:
  - O gráfico de **"Distribuição de Serviços"** anteriormente gerava 20+ fatias finas como agulhas com uma legenda flutuante do Recharts que quebrava em ~7 linhas e sobrepunha o próprio gráfico em formato de pizza.
  - A legenda flutuante foi completamente removida de dentro do canvas do Recharts, desacoplando o gráfico da lista de categorias.
- **Visual Executivo: Donut Limpo (Top 5 + Demais)**:
  - Agrupamento inteligente dos 5 serviços com maior volume de atendimentos e consolidação do restante sob a fatia **"Demais Serviços"**, limitando o Donut a no máximo 6 arcos bem definidos e elegantes.
  - Centro do Donut ampliado com métrica executiva integrada: contador total de atendimentos (`totalServicosRealizados`) em tipografia dourada refinada e rótulo claro.
  - Painel lateral dedicado de detalhamento dos Top 5:
    - Indicador de cor, nome do serviço e porcentagem da demanda.
    - Barra de progresso visual proporcional à participação.
    - Quantidade de atendimentos e faturamento total gerado em reais (`R$`).
- **Alternância de Visualização ("Destaques" vs. "Ranking Geral")**:
  - Seletor rápido no cabeçalho do card:
    - **Destaques**: Visualização Donut Chart + Top 5 com foco analítico imediato.
    - **Ranking Geral**: Listagem completa e rolável de todos os serviços realizados no período, com ranking ordenado (#1, #2, #3 com badge dourado), barras relativas ao serviço líder, total de atendimentos, faturamento acumulado e ticket médio por atendimento.
- **Otimização do Gráfico de "Performance por Profissional"**:
  - Linhas de grade sutis e elegantes (`rgba(20, 18, 14, 0.08)`), tooltips flutuantes com sombra suave e bordas arredondadas.
  - Cartões de KPIs Rápidos reformulados com alto contraste (`bg-emerald-100 text-emerald-800`, `bg-blue-100 text-blue-800`, etc.), garantindo leitura clara em qualquer tela.

---

## 8.20 Repaginação da Central de Comando (`/hub`) & Central de Atalhos

- **Correção da Sidebar e Altura do Container (`AdminShell`)**:
  - Em `components/AdminShell.tsx`, alteração do container flexível de `min-h-screen` para `h-screen overflow-hidden`, impedindo que a barra lateral colapsasse com altura zero no navegador.
  - Lista de navegação lateral no Hub atualizada com **todos os módulos principais do sistema**: Agenda, Recepção, Meu Painel, Clientes CRM, Noivas, Financeiro & Caixa, Comissões, Estoque & Insumos, Relatórios, Academy e Loja.
- **Central de Atalhos Rápidos no Corpo da Página**:
  - Grid de navegação com 17 atalhos organizados em 5 categorias essenciais:
    - *Studio & Operacional*: Agenda do Dia, Painel da Recepção, Meu Painel, Clientes CRM, Dia da Noiva.
    - *Financeiro & Suprimentos*: Fechamento de Caixa, Regras de Comissões, Estoque & Insumos, Relatórios Executivos, Notas Fiscais.
    - *Academy & Educação*: Cursos & Conteúdos, Alunos & Matrículas, Agendas de Cursos VIP.
    - *Loja & Vendas Físicas*: Dashboard da Loja, Produtos da Loja, Pedidos Realizados.
    - *Cadastros & Configurações*: Serviços & Preços, Equipe do Studio, Gestão do Sistema.
- **Agenda de Hoje com Dados Coerentes e Ricos**:
  - Resolução do problema onde aparecia literalmente "Cliente / Serviço • com Profissional": agora busca diretamente os relacionamentos reais via `fetchClientes()`, `fetchServicos()` e `fetchProfissionais()`.
  - Exibe nome completo do cliente, telefone/contato quando cadastrado, nome do procedimento, valor em R$, nome do profissional responsável, horário e badge de status legível com alto contraste.
- **Academy: Foco 100% Gestão (Remoção de Progresso como Aluno)**:
  - Eliminação da barra e mensagem "Seu progresso como aluno" / "Taxa de conclusão 0 de 0 aulas", já que o painel é de uso administrativo.
  - Substituição por métricas gerenciais dos **Cursos Ativos**: contagem de **Alunos Matriculados** por curso e **Total de Horas Assistidas/Consumidas**, além de estatísticas consolidadas de alunos ativos na plataforma.
- **Equipe do Studio Atualizada**:
  - Carregamento dos profissionais reais cadastrados no Supabase com fotos, cargos e especialidades.
  - Indicador de atendimentos realizados hoje por cada profissional (`X clientes hoje`) e status de atendimento ao vivo na cadeira.
- **Estimativa de Faturamento da Loja Física (Sem ML)**:
  - Remoção do card duplicado de atalho da loja no rodapé da página.
  - Adição de card/métrica executiva exclusiva de **Faturamento Estimado em Estoque Físico Local** (calculado sobre produtos próprios `LOCAL_STOCK` e vitrine do salão com `allow_sale`, desconsiderando links de afiliados do Mercado Livre).

---

## 8.21 Ciclo de Publicação de Cursos & Dashboard da Academy (`/admin-academy`)

- **Controle de Publicação dos Cursos (`DRAFT` vs `PUBLISHED`)**:
  - Novos cursos são criados inicialmente com status `DRAFT` (Rascunho), garantindo que módulos, aulas e vídeos sejam estruturados antes de ficarem visíveis para os alunos.
  - O catálogo público e área do aluno filtram estritamente por `status = 'PUBLISHED'`, mantendo rascunhos 100% ocultos.
- **Botões e Ações de Publicar / Despublicar**:
  - **Na Grade de Cursos (`/admin-academy/cursos`)**:
    - Cada card exibe badge de status nítido com alto contraste (🟢 *Publicado* ou 🟡 *Rascunho*).
    - Botão de ação rápida integrado: **"Publicar para Alunos"** (para rascunhos) ou **"Mudar para Rascunho"** (para cursos publicados), disparando atualização atômica via `PATCH`.
  - **Na Edição do Curso (`/admin-academy/cursos/[cursoId]`)**:
    - Cabeçalho superior com badge de status e botão proeminente **"🚀 Publicar Curso"** / **"Mudar para Rascunho"**.
    - Painel informativo na aba *Detalhes* explicando a visibilidade e o impacto na plataforma.
- **Atualização das Rotas da API (`/api/admin-academy/cursos/[id]`)**:
  - Rota `PUT` atualizada para receber e persistir o campo `status` no payload.
  - Implementado método `PATCH` para alternância ágil de status sem necessidade de reenviar todo o formulário.
  - Rota de estatísticas (`/api/admin-academy/dashboard/stats`) ajustada para contabilizar `cursosPublicados`, `cursosTotal` e `cursosRascunho`.
- **Ajustes no Dashboard da Academy (`/admin-academy`)**:
  - Substituição da busca de mock por chamada à API real de cursos, exibindo os cursos cadastrados pelo administrador na seção *Seus Cursos Cadastrados*.
  - Indicador de cursos em rascunho no card *Cursos Publicados* (`X em rascunho`).
  - Remoção da trava `max-w-6xl` no layout da Academy (`/admin-academy/layout.tsx`), aproveitando a largura total fluida da tela (`w-full max-w-none px-3 sm:px-5 lg:px-6`).

---

## 8.22 Reorganização do Hub Central & Fidelidade 100% aos Dados Reais (`/hub`)

- **Reorganização de Layout para Sinergia Operacional**:
  - **Grid 1 (Operação Imediata do Studio)**:
    - **Agenda de Hoje (2/3)**: lista em tempo real com clientes, procedimento, profissional, horários e status nítidos.
    - **Equipe do Studio (1/3)**: movida para ficar diretamente **ao lado do card de Agenda**, permitindo ao gestor conferir simultaneamente os atendimentos do dia e a carga/status ao vivo de cada profissional da equipe.
  - **Grid 2 (Analítico & Gestão Educacional)**:
    - **Faturamento do Salão Mês a Mês (2/3)**: gráfico de barras consolidando fechamentos do ano.
    - **Academy • Cursos Ativos (1/3)**: posicionado ao lado do faturamento, com métricas reais de gestão educacional.
- **Eliminação Definitiva de Mocks e Fallbacks na Academy**:
  - Removido o import `getCursos` de `lib/mock-data` e todas as fórmulas com fallbacks artificiais (`|| 24` alunos, `|| 148h` assistidas, `Math.max(4, 18 - idx*3)`).
  - Consulta realizada diretamente via API `/api/admin-academy/cursos` e Supabase real.
  - Se um curso ou a plataforma tiver `0` alunos, o sistema exibe fielmente `0 alunos`.
  - Se tiver `0h` assistidas, exibe fielmente `0h assistidas`.
  - Cada curso no Hub exibe badge real de status (`Publicado` ou `Rascunho`), contagem real de aulas gravadas no banco e contagem real de matrículas.
- **Ampliação de Permissões das APIs da Academy e Loja (`lib/api-auth.ts`)**:
  - `requireAcademyAuth` e `requireLojaAuth` agora autorizam também o perfil `studio_admin`, garantindo que o gestor geral transite e visualize todos os dados da Academy e Loja no Hub sem bloqueios ou erros 403.

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
