# Documentação do Projeto: Agnaldo Gomes Premium Studio & Academy

Este documento detalha toda a estrutura, páginas e componentes já criados para a plataforma. Serve como um guia de referência para manutenção e para a construção das próximas funcionalidades (como integração com banco de dados e APIs).

---

## 1. Visão Geral da Arquitetura
O projeto foi construído usando **Next.js (App Router)** com **TypeScript**, **Tailwind CSS** e animações via **Framer Motion**. A estrutura de pastas reflete as diferentes "zonas" de acesso da aplicação (Site Público, Sistema Admin e Área de Alunos).

---

## 2. Estrutura de Rotas (`app/`)

### 🌐 Área Pública (Site e Vendas)
Rotas abertas para o público, envoltas pelo `app/(public)/layout.tsx` que injeta o **Header** e **Footer** globais.

*   **`/` (Home):** A página principal do estúdio, focada em conversão. Apresenta Hero animado, sobre o artista (com efeito Parallax), serviços do salão, carrossel de marcas parceiras (`CarouselBackground` com transição lateral) e depoimentos.
*   **`/academy`:** A landing page de vendas dos cursos online. Focada em persuadir novos alunos a comprarem os módulos de formação (Visagismo, Coloração, etc.).

### 🛍️ E-commerce (Loja Pública)
A vitrine de produtos isolada em `app/(shop)/layout.tsx` para garantir que o layout da loja (tema claro, logo em destaque) não interfira no layout escuro do site institucional.
*   **`/loja`:** A vitrine principal com carrossel de banners automáticos, grade de produtos de alta densidade e design sofisticado (Bege/Areia).
*   **`/loja/p/[id]`:** Página de detalhes do produto, com botão de adicionar ao carrinho.
*   **`/loja/carrinho`:** Tela de resumo das compras.
*   **`/loja/checkout`:** Tela final preparada para integração com Mercado Pago e Melhor Envio.

### ⚙️ Sistema de Gestão (Admin)
O painel administrativo exclusivo para a equipe do salão. Possui um layout próprio com Sidebar lateral e é separado do site institucional.

*   **`/login`:** Tela de autenticação exclusiva para os gestores.
*   **`/admin` (Dashboard):** Tela inicial da gestão com gráficos simulados, KPIs de faturamento e agendamentos recentes.
*   **`/admin/sistema`:** Tela de configurações gerais da plataforma (integrações com WhatsApp, banco de dados, backups e temas).
*   **`/admin/perfil`:** Gerenciamento dos dados pessoais e senha do administrador (acessado pelo botão de usuário no menu).

### 📦 Gestão da Loja (Admin E-commerce)
Painel exclusivo para controle do E-commerce em `app/admin-loja`, fisicamente separado da gestão do salão.
*   **`/admin-loja` (Dashboard):** Visão geral de vendas, KPIs de receita e fila de pedidos recentes.
*   **`/admin-loja/produtos`:** Inventário que diferencia claramente produtos de Estoque Local vs. Afiliados (Mercado Livre).
*   **`/admin-loja/produtos/novo`:** Formulário inteligente que altera os campos requeridos dinamicamente (pede dimensões/peso para frete de estoque físico; pede apenas link e preço para itens do ML).
*   **`/admin-loja/pedidos`:** Central de controle de envios (ex: Motoboy, Melhor Envio) e status de pagamento.
*   **`/admin-loja/configuracoes`:** Tela segura para configuração dos Tokens do Mercado Pago (checkout) e Melhor Envio (frete).

### 🎓 Área do Aluno (Academy Members)
Um ambiente restrito, desenhado no estilo "plataforma de streaming" (Netflix), focando na imersão e consumo das vídeo-aulas (padrão Dark Mode).

*   **`/aluno` (Login):** Tela de entrada limpa com layout "Split Screen" (metade formulário, metade imagem premium).
*   **`/aluno/(logged)/layout.tsx`:** Layout base dos alunos com um Header transparente superior, logotipo, navegação simplificada e dropdown do usuário.
*   **`/aluno/(logged)/dashboard`:** Vitrine de cursos. O topo conta com um grande destaque "Continuar Assistindo" e abaixo os trilhos de "Meus Cursos" com barras de progresso.
*   **`/aluno/(logged)/cursos/[slug]`:** A sala de aula virtual (Player). Possui um player de vídeo falso ocupando grande parte da tela esquerda, e uma Sidebar direita com Acordeões para os Módulos e Aulas.
*   **`/aluno/(logged)/certificados`:** Tela de recompensas, listando os certificados de conclusão para download em PDF.
*   **`/aluno/(logged)/perfil`:** Configurações da conta do aluno.

---

## 3. Componentes Reutilizáveis Principais (`components/`)

*   **`Button.tsx`**: Botões padronizados em diversas variantes (`primary`, `secondary`, `outline`, `glass`) e tamanhos.
*   **`CardGlass.tsx`**: Caixas com efeito Glassmorphism (vidro fosco) super elegantes, usadas em formulários e cards de cursos.
*   **`SectionTitle.tsx`**: Títulos de seção padronizados com subtítulos e pequenos traços dourados.
*   **`AdminUserButton.tsx`**: O card com a foto do admin logado no menu lateral, incluindo a lógica do Popover de "Sair da Conta" (com roteamento para `/login`).
*   **`CarouselBackground.tsx`**: Lógica de "Seamless Marquee" (loop contínuo) construída com Framer Motion, usada para passar as fotos dos produtos no fundo da aba "Artista das Marcas".

### Animações (`components/motion/`)
Uma pasta dedicada a abstrair a biblioteca `framer-motion`:
*   `Reveal`: Faz o conteúdo surgir suavemente conforme o usuário dá scroll (Fade In / Slide Up).
*   `Stagger` / `StaggerItem`: Exibe listas ou grupos de cards um de cada vez, criando um efeito de cascata lindo na interface.
*   `ParallaxImage`: Usado na foto de perfil do Agnaldo na home, fazendo a imagem se deslocar em velocidade diferente do scroll da página.

---

## 4. Gerenciamento de Estado e Regras de Negócio E-commerce
*   **Estado Global do Carrinho (`store/cartStore.ts`)**: Utilizamos a biblioteca **Zustand** combinada com `persist` para armazenar os itens do carrinho no `localStorage`. Isso impede a perda do carrinho no refresh da página. Adicionamos verificações estritas de estado `mounted` no cliente para evitar os temidos erros de *Hydration Mismatch* do Next.js.
*   **Remote Patterns**: O arquivo `next.config.ts` foi instruído a baixar imagens dos servidores `http2.mlstatic.com` para permitir o rendering direto de fotos de produtos do Mercado Livre com o componente `<Image>` ultra otimizado.

---

## 4. Configurações Especiais e Correções Importantes
*   **`next.config.ts`**: Configurado com `remotePatterns` para permitir o download de imagens de testes via `images.unsplash.com`.
*   **`layout.tsx` (Global)**: Aplicamos o `suppressHydrationWarning` na tag `<html>` e garantimos que o `Script` de troca de temas (`theme-init.js`) rodasse na tag `<head>`. Isso eliminou um erro nativo do Next.js conhecido como *Hydration Mismatch*.
*   **Opacidade das imagens na Home**: Reduzimos a máscara escura de cima do carrossel para 50% (`bg-background/50`) para que os produtos (como o shampoo Mirra) ficassem mais visíveis na tela.

---

## 5. Próximos Passos (Backlog)
Toda a parte de **Front-end** e **User Experience (UX/UI)** das 3 zonas (Site, Admin, Alunos) foi construída com sucesso usando dados simulados (mockados). 

O próximo passo lógico seria a integração do **Back-end**:
1. Conectar a autenticação (ex: Firebase Auth, Supabase ou Clerk).
2. Criar as tabelas no Banco de Dados (ex: PostgreSQL/Prisma).
3. Transformar os dados estáticos dos cursos, módulos e painel financeiro em dados reais vindos da API.
