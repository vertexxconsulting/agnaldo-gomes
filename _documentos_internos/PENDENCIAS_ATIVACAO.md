# 📋 Pendências de Ativação Técnica — Ecossistema Agnaldo Gomes

Este documento consolida todas as integrações preparadas no sistema e os passos necessários para a ativação real assim que o domínio definitivo e as contas do cliente estiverem disponíveis.

---

## 1. Pagamentos Studio (Mercado Pago)
O sistema de agendamento e o módulo "Dia da Noiva" estão preparados para gerar PIX real com sinal de 50%.

| Item | Status | O que fazer |
| :--- | :--- | :--- |
| **Credenciais** | Pendente | Acessar `/admin/pagamentos` e inserir o **Access Token** de Produção do Mercado Pago. |
| **Ativação** | Pronta | Ligar a chave "Ativar Pagamentos Reais" no painel. |
| **Teste** | Pendente | Realizar um agendamento de teste para validar a geração do QR Code. |

---

## 2. Pagamentos Academy (Stripe)
O fluxo de matrículas da Academy está integrado ao Stripe para pagamentos via Cartão e PIX.

| Item | Status | O que fazer |
| :--- | :--- | :--- |
| **Credenciais** | Pendente | Acessar `/admin-academy/pagamentos` e inserir a **Publishable Key** e **Secret Key**. |
| **Webhook** | Pendente | Configurar no Stripe Dashboard: `https://agnaldogomes.vercel.app/api/webhooks/stripe`. |
| **Evento** | Pendente | Habilitar o evento `checkout.session.completed` no webhook. |

---

## 3. Hospedagem de Vídeo (Vimeo)
A Academy está preparada para carregar vídeos privados do Vimeo via API.

| Item | Status | O que fazer |
| :--- | :--- | :--- |
| **API Access** | Pendente | Acessar `/admin-academy/vimeo` e inserir **Access Token**, **Client ID** e **Client Secret**. |
| **Configuração** | Pronta | Garantir que os vídeos no Vimeo estejam com permissão de "Embed" restrita ao domínio do site. |
| **Uploads** | Manual | Inserir os IDs dos vídeos nas aulas via painel administrativo de cursos. |

---

## 4. Comunicação (WhatsApp)
A "Trava de Segurança" de agendamento e cancelamento via WhatsApp está configurada.

| Item | Status | O que fazer |
| :--- | :--- | :--- |
| **Número Destino** | Configurado | O sistema envia para o número cadastrado na Vertex/Studio. |
| **Links de Ação** | Prontos | A atendente recebe links para confirmar/cancelar direto pelo WhatsApp. |
| **Evolution API** | Oculta | A integração base existe, mas está invisível conforme solicitado. |

---

## 5. CRM e Automação (Bolten)
A integração com o Bolten CRM está preparada mas oculta.

| Item | Status | O que fazer |
| :--- | :--- | :--- |
| **Acesso** | Bloqueado | A rota `/admin/bolten` exibe aviso de contato com a Vertex Consulting. |
| **Chave API** | Pendente | Inserir o Bearer Token nas variáveis de ambiente se for reativar. |

---

## 6. Domínio e Deploy (Vercel)
O sistema está rodando no domínio temporário da Vercel.

| Item | Status | O que fazer |
| :--- | :--- | :--- |
| **Domínio Final** | Pendente | Apontar o domínio `agnaldogomes.com.br` (ou similar) para os DNS da Vercel. |
| **SSL** | Automático | A Vercel gerará o certificado assim que o domínio for propagado. |
| **Env Vars** | Revisar | Atualizar `NEXT_PUBLIC_SUPABASE_URL` e chaves se o projeto mudar de banco. |

---

> **Nota de Segurança:** Todas as credenciais inseridas nos painéis administrativos são salvas de forma criptografada/segura no banco de dados Supabase e nunca ficam expostas no código fonte do GitHub.

**Última Atualização:** 21 de Agosto de 2026
**Responsável:** Manus AI via Vertex Consulting
