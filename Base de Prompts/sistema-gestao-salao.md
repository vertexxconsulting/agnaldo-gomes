# Sistema de Gestão para Salão de Beleza

## 1. Visão Geral

Sistema dividido em **2 frentes**:

- **App do Cliente** (agendamento via link/WhatsApp, sem senha, identificação por telefone)
- **Painel de Gestão** (admin/recepção/profissionais) — onde mora a inteligência do negócio

Stack sugerida (alinhada ao seu padrão): Next.js 14 + Supabase (Postgres + RLS + Realtime) + Vercel + Evolution API (WhatsApp) + Stripe/Pix para pagamento online (opcional).

---

## 2. Fluxo do Cliente (conforme especificado)

```
1. Cliente acessa link (enviado via WhatsApp ou fixo)
2. Insere Nome + Telefone
   ├─ Telefone já cadastrado → carrega histórico, nome preenchido, pula pra tela de serviços
   └─ Telefone novo → cria cadastro rápido (nome, telefone, aceite LGPD) → segue fluxo
3. Lista de Serviços (sem valores) — categorizados (Cabelo, Unhas, Estética, etc.)
4. Cliente escolhe o serviço
5. Sistema mostra Profissionais que executam aquele serviço
   (ou pula direto se só houver 1 profissional pro serviço)
6. Calendário do profissional: dias disponíveis → horários livres (baseado em agenda + duração do serviço)
7. Confirmação do agendamento → grava no banco → dispara WhatsApp de confirmação
8. "Meus Agendamentos": mesmo fluxo de identificação (nome + telefone) → lista agendamentos
   futuros e histórico → opção de cancelar/reagendar dentro da política definida
9. Pós-atendimento: status muda para "concluído" → dispara mensagem de avaliação
   (link único, 1x a cada 3 meses por cliente, controlado por trigger automático)
```

**Por que não mostrar valores na etapa de escolha do serviço:** decisão de produto sua — mas
vale existir uma tela seguinte (antes da confirmação final) mostrando o valor total, para
evitar no-show por cliente "surpreso" com o preço.

---

## 3. Módulos do Painel de Gestão

### 3.1 Agenda / Calendário
- Visão por profissional, por dia/semana/mês
- Bloqueio de horários (folga, almoço, feriado, férias)
- Encaixe manual (recepção agenda por telefone também)
- Drag-and-drop para reagendar
- Status do agendamento: `pendente → confirmado → em atendimento → concluído → cancelado/no-show`
- Alerta de conflito de horário

### 3.2 Clientes (CRM)
- Cadastro: nome, telefone, e-mail, data de nascimento, observações (alergias, preferências)
- Histórico completo de atendimentos e valores gasto
- Ticket médio e frequência (para identificar clientes VIP e clientes inativos)
- Tags/segmentação (ex: "não vem há 60 dias" → gatilho de reengajamento)
- Aniversariantes do mês (para campanha automática)

### 3.3 Serviços
- Nome, categoria, duração (em minutos — essencial pro cálculo de agenda), preço
- Serviços combináveis (ex: corte + escova em sequência, calculando tempo total)
- Serviço ativo/inativo, visível ou não no app do cliente
- Vínculo: quais profissionais executam qual serviço

### 3.4 Profissionais
- Cadastro, especialidades, foto (para o app do cliente)
- Horário de trabalho por dia da semana (jornada individual)
- Comissão por serviço (% ou valor fixo)
- Agenda pessoal bloqueável
- Login próprio (ver só a própria agenda) — perfil de acesso restrito

### 3.5 Financeiro
- Caixa diário (abertura/fechamento)
- Formas de pagamento: dinheiro, Pix, cartão (débito/crédito), pacote pré-pago
- Comissionamento automático por profissional/serviço
- Contas a pagar (produtos, aluguel, insumos)
- Fluxo de caixa e DRE simplificado
- Relatório de faturamento por período, por serviço, por profissional

### 3.6 Estoque (se o salão vende/usa produtos)
- Produtos e insumos (tintas, esmaltes, etc.)
- Baixa automática de insumo por serviço executado (opcional, mais avançado)
- Alerta de estoque mínimo
- Produtos à venda (registrar venda avulsa no caixa)

### 3.7 Avaliações / NPS
- Disparo automático pós-atendimento (regra: 1x a cada 3 meses por cliente — como você definiu)
- Nota + comentário
- Painel de avaliações por profissional (ajuda a identificar quem precisa de atenção)
- Alerta para nota baixa (ex: nota ≤ 3 → notificação pro dono)

### 3.8 Automação via WhatsApp (Evolution API)
- Confirmação de agendamento (imediata)
- Lembrete (24h e/ou 2h antes)
- Aviso de cancelamento/reagendamento
- Mensagem pós-atendimento com link de avaliação
- Campanha de reengajamento (cliente sumido há X dias)
- Parabéns de aniversário (com ou sem cupom)
- Confirmação de recebimento de pagamento (se pagamento online)

### 3.9 Fidelidade / Pacotes
- Pacote de sessões pré-pago (ex: 10 sessões de depilação)
- Programa de pontos/cashback (opcional)
- Cupons de desconto

### 3.10 Dashboard / Relatórios
- Faturamento do dia/mês, comparativo período anterior
- Taxa de ocupação da agenda por profissional
- Taxa de no-show / cancelamento
- Ticket médio
- Serviços mais vendidos
- Origem do cliente (indicação, Instagram, etc.)

### 3.11 Configurações Gerais
- Horário de funcionamento do salão
- Política de cancelamento (ex: até 2h antes sem multa)
- Antecedência mínima/máxima para agendamento online
- Intervalo entre atendimentos (buffer de limpeza/organização)
- Papéis de acesso: Admin, Recepção, Profissional
- Multi-unidade (se pensar em expandir para mais de um salão)

### 3.12 Segurança e Conformidade
- LGPD: aceite explícito no primeiro cadastro do cliente
- RLS por unidade/tenant (se multi-salão)
- Log de alterações em agendamentos (quem alterou o quê)

---

## 4. Modelo de Dados (entidades principais)

```
clientes            (id, nome, telefone [único], email, nascimento, criado_em)
profissionais        (id, nome, foto, ativo, jornada_semanal JSON)
servicos             (id, nome, categoria, duracao_min, preco, ativo)
profissional_servico (profissional_id, servico_id)
agendamentos         (id, cliente_id, profissional_id, servico_id, data, hora_inicio,
                       hora_fim, status, criado_em, canal ["online"|"recepcao"])
avaliacoes           (id, agendamento_id, cliente_id, nota, comentario, criado_em)
avaliacao_envios     (cliente_id, ultimo_envio_em)  -- controla a regra de 3 meses
transacoes           (id, agendamento_id, valor, forma_pagamento, comissao_profissional, data)
bloqueios_agenda     (profissional_id, data_inicio, data_fim, motivo)
mensagens_whatsapp   (id, cliente_id, tipo, status_envio, enviado_em)
```

---

## 5. Regras de Negócio Críticas (para não esquecer na implementação)

1. **Identificação por telefone**: normalizar número (remover formatação, DDI) antes de comparar no banco, ou vai duplicar cadastro.
2. **Concorrência de horário**: dois clientes não podem reservar o mesmo slot simultaneamente — usar transação/lock no Supabase ao confirmar agendamento.
3. **Cálculo de horários disponíveis**: jornada do profissional − bloqueios − agendamentos existentes − buffer entre atendimentos.
4. **Regra dos 3 meses da avaliação**: job/trigger que verifica `avaliacao_envios.ultimo_envio_em` antes de disparar, não apenas "toda conclusão de atendimento".
5. **Cancelamento pelo cliente**: aplicar política definida (ex.: bloquear cancelamento com menos de X horas de antecedência, ou permitir mas notificar o salão).
6. **No-show**: precisa de campo de status separado de "cancelado" para métricas confiáveis.

---

## 6. Sugestão de Fases de Implementação

| Fase | Entregável |
|---|---|
| 1 | Cadastro de clientes/profissionais/serviços + agenda manual (uso interno) |
| 2 | App do cliente: fluxo de agendamento online completo (como descrito) |
| 3 | WhatsApp automático (confirmação, lembrete, avaliação) via Evolution API |
| 4 | Financeiro + comissão + caixa |
| 5 | Dashboard/relatórios + estoque + fidelidade |

---

## 7. Pontos em Aberto para Você Decidir

- Pagamento é feito **no salão** ou terá opção de pagar/sinalizar online no agendamento?
- Cliente pode **cancelar/reagendar** sozinho pelo app ou só visualizar (falar com recepção)?
- Vai ser **single-tenant** (1 salão) ou multi-tenant (modelo SaaS para vender a outros salões, como no padrão dos seus outros projetos)?
