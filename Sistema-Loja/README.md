# Sistema-Gestor Studio

Sistema de gestão de estúdio de beleza — painel administrativo para gestão de agenda, clientes, equipe, estoque, serviços, profissionais, comissões, pagamentos, notas fiscais, fidelidade, marketing, IA assistente, API e configurações do sistema.

> Foco: **gestão do studio** — não e-commerce (a loja é uma vitrine separada).

## Visão do Produto

O Sistema-Gestor é o painel administrativo do estúdio de beleza. Ele reúne toda a operação do dia a dia:

- **Agenda** — horários, agendamentos, intalvações
- **Clientes** — CRM, histórico, pontos fidelidade
- **Equipe** — gestão de profissionais, permissões
- **Estoque** — insumos, produtos, controle de quantidade
- **Serviços** — catálogo de serviços, preços, durações
- **Profissionais** — perfis, categorias, especialidades
- **Comissões** — regras de comissão, parcelas
- **Pagamentos** — caixa, forma de pagamento, fluxos
- **Notas Fiscais** — emissão, rastreabilidade
- **Fidelidade** — pontos, resgate, programa
- **Marketing** — mensageria, regras de envio
- **IA Assistente** — assistente de gestão
- **API** — endpoints, status, health-check
- **Configurações do Sistema** — integrações, configurações gerais

## Público

- **Administrador** (ADMIN): acesso total
- **Gestor do Studio** (studio_admin): acesso a todas as áreas operacionais
- **Secretária** (studio_secretaria): agenda, clientes, recepção
- **Profissional** (studio_profissional): agenda profissional, serviços, atualizações

## Arquitetura

```
app/
├── admin/              # Painel de gestão (dashboard + módulos)
│   ├── layout.tsx      # Layout do admin (sidebar, header, theme)
│   ├── page.tsx        # Dashboard principal (recepção)
│   ├── agenda/         # Agenda e intalvações
│   ├── clientes/       # CRM e gestão de clientes
│   ├── equipe/         # Gestão de equipe e permissões
│   ├── estoque/        # Controle de estoque
│   ├── servicos/       # Catálogo de serviços
│   ├── profissionais/  # Gestão de profissionais
│   ├── comissoes/      # Regras e relatórios de comissão
│   ├── pagamentos/     # Financeiro e caixa
│   ├── notas-fiscais/  # Notas fiscais
│   ├── fidelidade/     # Programa de fidelidade
│   ├── marketing/      # Mensageria e regras
│   ├── ia-assistente/  # IA Assistente
│   ├── api/            # Sistema API e integrações
│   ├── sistema/        # Configurações gerais
│   └── tutorial/       # Ajuda e tutorial
├── hub/                # Command Center (visão geral do estúdio)
└── login/              # Login de administrador
```

## Fluxos Principais

### 1. Agendamento de Consulta

```
Cliente (online) → Recepciona (app/admin/agenda) → Profissional (app/admin/agenda)
```

Fluxos:
- **Online**: cliente escolhe serviço, profissional e hora; sistema confirma
- **Receção**: secretária cadastra cliente e agendamento manualmente
- **Manual**: gestor registra agendamento diretamente

Status do agendamento: `pendente → confirmado → em_atendimento → concluido | cancelado | no_show`

### 2. Recepção de Cliente

```
Nova Reunião (Receção) → Configurar Cliente → Atribuir Profissional → Notificar WhatsApp
```

### 3. Gestão de Equipe

```
Perfil de Profissional → Configurar Jornada → Definir Serviços → Informal
```

### 4. Controle de Estoque

```
Adicionar Insumo → Associa a Serviço → Registrar Uso → Ajustar Quantidade
```

## Banco de Dados (Supabase)

Esquema principal:

- `clientes` — dados de cadastro
- `agendamentos` — consultas agendadas
- `servicos` — serviços oferecidos
- `profissionais` — equipe
- `produtos_estoque` — itens do estoque
- `movimentacoes_estoque` — entradas/saídas
- `comissoes` — regras de comissão
- `notas_fiscais` — NF e rastreabilidade
- `fidelidade` — pontos e resgates
- `marketing` — mensageria e regras

## Regras de Negócio

- **Agendamento exclusivo**: o horário só pode ser reservado por um cliente
- **Perfis de acesso**: cada perfil tem permissões limitadas
- **Estoque mínimo**: alerta quando quantidade cair abaixo do mínimo
- **Comissão**: regra por serviço ou profissional, com parcelamento
- **Notas fiscais**: emissão automática após confirmação do pagamento
- **Fidelidade**: pontos por serviço; resgate por pontos

## Exceções e Limitações

- Não há sistema de pagamento integrado (em desenvolvimento)
- Notas fiscais são modelos a serem preenchidos manualmente
- Fidelidade é acumulativa por cliente
- Jornadas de trabalho são configuráveis por profissional
- Horários de funcionamento podem variar por dia da semana

## User Stories

- **Receção**: "Quero ver todas as consultas do dia para recepcionar os clientes"
- **Gestor**: "Quero ver o relatório financeiro do mês para fechar o caixa"
- **Profissional**: "Quero ver só o meu perfil de agenda e os serviços que faço"
- **Secretária**: "Quero cadastrar clientes e marcar agendamento rapidamente"
- **Gestor**: "Quero controlar o estoque de insumos para não faltar nos serviços"

## Casos de Uso

- Agendar consulta online
- Receber cliente no estúdio
- Ajustar preço de serviço
- Gerar relatório financeiro

## Atividades

1. Verificar agendamentos do dia
2. Registrar novo agendamento
3. Atualizar status de consulta
4. Cadastrar novo cliente
5. Visualizar histórico de cliente
6. Definir serviço
7. Aumentar quantidade de estoque
8. Resgatar pontos de fidelidade
9. Enviar mensagem para cliente

## Critérios de Aceitação

- Agendamento aprovado com confirmação
- Cliente cadastrado com e-mail único
- Serviço salvo com preço e duração
- Estoque atualizado após uso
- Relatório financeiro gerado

## Edge Cases

- Horário já ocupado
- Cliente sem cadastro
- Serviço indisponível
- Estoque esgotado
- Pagamento com método indefinido
- Perfil de acesso negado
- Nota fiscal emitida sem pagamento
- Quantidade mínima de estoque atingida
- Jornada fora do horário
- Comissão sem valor definido

## Padrões

- **Cores**: dark premium (black, copper, gold)
- **Tipografia**: Montserrat (headings), Inter (body)
- **Espaçamento**: 8px grid
- **Radios**: 8px
- **Sombra**: elevacao leve
- **Transição**: 200ms

## Emojis e Ícones

- Sempre usar ícones SVG (Lucide)
- Sem emojis em prodotto
- Ícones sempre consistentes

## Zebra

- Sempre usar cor neutra (white/slate)
- Sem cores vibrantes
- Sem gradientes brilhantes
- Dark mode obrigatório
