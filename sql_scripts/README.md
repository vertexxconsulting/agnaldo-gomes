# Documentação de Banco de Dados (Supabase)

Os scripts SQL foram organizados por **módulos do sistema** (camadas) para facilitar a leitura e manutenção. Como o banco de dados evoluiu ao longo do tempo, os arquivos representam as diversas migrations criadas para cada funcionalidade.

## Camadas

### 📁 01_core
Contém os scripts fundamentais do sistema, como:
- \supabase_schema_full.sql\: Schema inicial completo da aplicação.
- \setup_storage.sql\: Configuração de buckets do Supabase Storage.
- \supabase_migration_audit.sql\: Tabelas e triggers de log e auditoria de ações no sistema.
- \supabase_migration_settings.sql\: Configurações globais do tenant.
- Migrações genéricas de permissões (RLS), webhooks globais (Stripe/MP), idempotência, relatórios financeiros e importação do sistema legado (Fox).

### 📁 02_studio
Tabelas relacionadas às operações de salão de beleza e serviços:
- **Agendamentos**: Regras de comandas, agendamentos ativos, e configuração de bloqueios de agenda.
- **Clientes e Finanças**: Códigos de clientes fixos, pacotes de noivas, e regras de variação de preços de serviços.
- **Comissões**: Regras de comissionamento padrão de profissionais do estúdio.

### 📁 03_academy
Ambiente da Plataforma EAD / Cursos:
- **Cursos**: Tabelas base de cursos (online e VIP), aulas e integração com provedor de vídeos (BunnyCDN/Vimeo).
- **Vendas e Pagamentos**: Webhooks de integração (Hotmart), e pagamentos de academy.
- **Engajamento**: Comunidade, configurações da academy, e emissão de certificados com background customizável.

### 📁 04_loja
E-commerce de Produtos Profissionais:
- **Catálogo e Estoque**: Produtos, controle de inventário, integração de estoque, upload de imagens múltiplas.
- **Vendas**: Carrinho de compras, checkouts atrelados ao estoque, cálculo de envio e cupons de desconto.
- **Retenção**: Programa de Fidelidade (produtos elegíveis e sistema de acúmulo de pontos).
- **Comissões**: Comissionamento na venda de produtos para os profissionais do salão.

### 📁 05_seeds
Scripts para popular o banco de dados inicial (Seeders):
- Inserção de serviços base do Agnaldo Gomes.
- Atualização e correção de registros antigos para padrões atuais de UUIDs.

---
**Observação**: Ao aplicar em um novo banco de dados, recomenda-se iniciar pela camada **01_core**, preenchendo as tabelas auxiliares em seguida (Studio, Academy, Loja) e finalizar rodando as Seeds (05_seeds).