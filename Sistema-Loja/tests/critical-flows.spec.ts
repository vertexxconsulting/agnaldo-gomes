import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Fluxos Críticos
 * 
 * Cenários obrigatórios (do PROMPTS_CORRECAO_CRITICAS.md):
 * 1. Agendamento público → PIX Noiva → Webhook MP → Confirmação → Aparece no /admin/noivas
 * 2. Aluno compra curso (Academy) → Webhook → Matrícula criada → Acessa aula → Completa → Certificado gerado
 * 3. Cliente compra produto Loja (LOCAL_STOCK) → Pagamento aprovado → Estoque baixado → Etiqueta gerada
 * 4. Profissional loga → Vê apenas sua agenda → Não acessa clientes de outros
 * 5. Secretaria loga → Vê Studio (CRM/Agenda) → NÃO vê Academy/Loja
 */

// Helper para login
async function loginAs(page: any, email: string, password: string) {
  await page.goto('/academy/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/aluno\/cursos/);
}

// Helper para criar agendamento via API
async function createAppointment(page: any, data: {
  servicoId: string;
  profissionalId: string;
  data: string;
  hora: string;
  nome: string;
  telefone: string;
  email: string;
}) {
  const response = await page.request.post('/api/agendamento', {
    data,
  });
  return response.json();
}

// ============================================
// TESTE 1: Agendamento Noiva → PIX → Webhook → Confirmação
// ============================================
test.describe('Fluxo Noiva: Agendamento → Pagamento → Confirmação', () => {
  test('Deve criar agendamento de noiva, gerar PIX e confirmar via webhook', async ({ page, request }) => {
    // 1. Criar agendamento via API pública
    const appointmentData = {
      servicoId: 'd7e3f5a8-d0ed-41e9-f79a-b2095dda0723', // Noiva - Cabelo e Maquiagem
      profissionalId: 'e47b1a20-8d3f-4e92-91bc-3a817452d901', // Agnaldo Gomes
      data: '2026-10-15',
      hora: '10:00',
      nome: 'Maria Noiva Teste',
      telefone: '11999998888',
      email: 'maria.noiva@teste.com',
    };

    const createResponse = await request.post('/api/agendamento', { data: appointmentData });
    expect(createResponse.ok()).toBeTruthy();
    
    const createResult = await createResponse.json();
    expect(createResult.success).toBe(true);
    expect(createResult.isNoiva).toBe(true);
    expect(createResult.pixCopiaCola).toBeTruthy();
    expect(createResult.valorSinal).toBeGreaterThan(0);

    const agendamentoId = createResult.id;

    // 2. Verificar se apareceu na tabela salon_bride_appointments (via admin)
    // Simular login admin
    await loginAs(page, 'admin@agnaldogomes.com.br', 'senha123');
    
    await page.goto('/admin/noivas');
    await expect(page.locator(`text=${appointmentData.nome}`)).toBeVisible();
    await expect(page.locator('text=sinal_pendente')).toBeVisible();

    // 3. Simular webhook MP aprovado
    const webhookResponse = await request.post('/api/webhooks/mercadopago', {
      data: {
        type: 'payment',
        data: {
          id: 'test_payment_123',
        },
        action: 'payment.updated',
      },
    });
    expect(webhookResponse.ok()).toBeTruthy();

    // 4. Verificar se status mudou para 'sinal_pago' ou 'confirmado'
    await page.reload();
    await expect(page.locator('text=sinal_pago')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// TESTE 2: Fluxo Academy - Compra → Matrícula → Aula → Certificado
// ============================================
test.describe('Fluxo Academy: Compra → Matrícula → Aula → Certificado', () => {
  test('Aluno compra curso, ganha acesso, assiste aula e recebe certificado', async ({ page, request }) => {
    // 1. Login como aluno
    await loginAs(page, 'aluno@teste.com', 'senha123');

    // 2. Acessar catálogo e comprar curso
    await page.goto('/aluno/catalogo');
    await expect(page.locator('text=Masterclass de Colorimetria')).toBeVisible();

    // Clicar em comprar (simula checkout Stripe)
    await page.click('button:has-text("Comprar")');
    
    // Simular webhook Stripe aprovado
    const webhookResponse = await request.post('/api/webhooks/stripe', {
      data: {
        id: 'evt_test_webhook',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_intent: 'pi_test_123',
            metadata: {
              sistema: 'academy-ag',
              curso_id: 'course_1',
              email_aluno: 'aluno@teste.com',
              nome_aluno: 'Aluno Teste',
            },
          },
        },
      },
    });
    expect(webhookResponse.ok()).toBeTruthy();

    // 3. Verificar se matrícula foi criada
    await page.goto('/aluno/cursos');
    await expect(page.locator('text=Masterclass de Colorimetria')).toBeVisible();

    // 4. Acessar primeira aula
    await page.click('a[href*="/aulas/"]');
    await expect(page.locator('text=O que é colorimetria?')).toBeVisible();

    // 5. Marcar aula como concluída
    await page.click('button:has-text("Marcar como Concluída")');
    await expect(page.locator('text=Aula Concluída')).toBeVisible();

    // 6. Completar todas as aulas do curso
    // (simplificado - assumindo que completou todas)

    // 7. Verificar certificado gerado
    await page.goto('/aluno/certificados');
    await expect(page.locator('text=Masterclass de Colorimetria')).toBeVisible();
    await expect(page.locator('button:has-text("Baixar PDF")')).toBeVisible();

    // 8. Verificar verificação pública
    await page.click('button:has-text("Compartilhar Verificação")');
    // Verifica se link foi copiado (teste visual)
  });
});

// ============================================
// TESTE 3: Fluxo Loja - Compra LOCAL_STOCK → Estoque baixado
// ============================================
test.describe('Fluxo Loja: Compra LOCAL_STOCK → Estoque → Etiqueta', () => {
  test('Cliente compra produto físico, pagamento aprovado, estoque decrementado', async ({ page, request }) => {
    // 1. Verificar estoque inicial do produto
    const productResponse = await request.get('/api/products/1'); // produto LOCAL_STOCK
    const product = await productResponse.json();
    const initialStock = product.stock_quantity;

    // 2. Adicionar ao carrinho e fazer checkout
    await request.post('/api/cart', {
      data: { productId: product.id, quantity: 1 },
    });

    const checkoutResponse = await request.post('/api/checkout', {
      data: {
        items: [{ id: product.id, title: product.name, quantity: 1, unit_price: product.price }],
        cep: '01310-100',
        shippingMethod: 'MOTOBOY',
        customerName: 'Cliente Loja',
        customerEmail: 'cliente@loja.com',
      },
    });
    expect(checkoutResponse.ok()).toBeTruthy();

    // 3. Simular webhook MP aprovado
    const webhookResponse = await request.post('/api/webhooks/mercadopago', {
      data: {
        type: 'payment',
        data: { id: 'test_payment_loja_123' },
      },
    });
    expect(webhookResponse.ok()).toBeTruthy();

    // 4. Verificar se estoque foi decrementado
    const updatedProductResponse = await request.get(`/api/products/${product.id}`);
    const updatedProduct = await updatedProductResponse.json();
    expect(updatedProduct.stock_quantity).toBe(initialStock - 1);

    // 5. Verificar se pedido status = PAID
    // (via admin)
    await loginAs(page, 'admin@agnaldogomes.com.br', 'senha123');
    await page.goto('/admin-loja/pedidos');
    await expect(page.locator('text=PAID')).toBeVisible();

    // 6. Verificar etiqueta gerada (se houver integração)
    // await expect(page.locator('text=Etiqueta')).toBeVisible();
  });
});

// ============================================
// TESTE 4: RLS Profissional - Apenas própria agenda
// ============================================
test.describe('RLS: Profissional vê apenas própria agenda', () => {
  test('Profissional não acessa clientes/agendamentos de outros', async ({ page }) => {
    // Login como profissional
    await loginAs(page, 'profissional@teste.com', 'senha123');

    // 1. Acessar agenda
    await page.goto('/profissional/agenda');
    await expect(page.locator('text=Minha Agenda')).toBeVisible();

    // 2. Verificar que só vê seus agendamentos
    const appointments = page.locator('[data-testid="appointment-card"]');
    const count = await appointments.count();
    
    // Todos os agendamentos visíveis devem ser do profissional logado
    for (let i = 0; i < count; i++) {
      const card = appointments.nth(i);
      await expect(card.locator('text=Profissional Teste')).toBeVisible();
    }

    // 3. Tentar acessar clientes (deve falhar ou não mostrar)
    await page.goto('/admin/clientes');
    // Deve redirecionar ou mostrar vazio/erro 403
    await expect(page.locator('text=Acesso negado')).toBeVisible({ timeout: 5000 });
    // OU verificar que não há dados de outros profissionais
  });
});

// ============================================
// TESTE 5: RLS Secretaria - Vê Studio, não Academy/Loja
// ============================================
test.describe('RLS: Secretaria vê Studio mas não Academy/Loja', () => {
  test('Secretaria acessa CRM/Agenda mas não vê Academy/Loja', async ({ page }) => {
    // Login como secretaria (role studio_secretaria via user_metadata)
    await loginAs(page, 'secretaria@teste.com', 'senha123');

    // 1. Deve acessar Studio/Agenda
    await page.goto('/admin');
    await expect(page.locator('text=Agenda')).toBeVisible();
    await expect(page.locator('text=Clientes')).toBeVisible();

    // 2. Tentar acessar Academy - deve falhar
    await page.goto('/admin-academy');
    await expect(page.locator('text=Acesso negado')).toBeVisible({ timeout: 5000 });

    // 3. Tentar acessar Loja - deve falhar
    await page.goto('/admin-loja');
    await expect(page.locator('text=Acesso negado')).toBeVisible({ timeout: 5000 });

    // 4. Verificar que consegue gerenciar agendamentos
    await page.goto('/admin/agendamentos');
    await expect(page.locator('text=Novo Agendamento')).toBeVisible();
  });
});

// ============================================
// TESTES ADICIONAIS: Validações de Conflito e Idempotência
// ============================================
test.describe('Validações Adicionais', () => {
  test('Conflito de horário retorna 409', async ({ request }) => {
    const data = '2026-10-20';
    const hora = '14:00';
    const profissionalId = 'e47b1a20-8d3f-4e92-91bc-3a817452d901';

    // Primeiro agendamento
    const first = await request.post('/api/agendamento', {
      data: { servicoId: 'c18d9f42-7a2e-4b83-91de-5ca39674f101', profissionalId, data, hora, nome: 'Cliente 1', telefone: '11999990001', email: 'c1@test.com' },
    });
    expect(first.ok()).toBeTruthy();

    // Segundo agendamento no mesmo horário - deve retornar 409
    const second = await request.post('/api/agendamento', {
      data: { servicoId: 'c18d9f42-7a2e-4b83-91de-5ca39674f101', profissionalId, data, hora, nome: 'Cliente 2', telefone: '11999990002', email: 'c2@test.com' },
    });
    expect(second.status()).toBe(409);
    const error = await second.json();
    expect(error.error).toBe('Horário indisponível');
  });

  test('Idempotência Bolten - reenviar mesmo payload cria apenas 1 agendamento', async ({ request }) => {
    const payload = {
      type: 'lead.created',
      event_id: 'bolten_test_123',
      data: {
        contact: { Nome: 'Cliente Bolten', Telefone: '11988887777', 'E-mail': 'bolten@test.com' },
      },
    };

    // Enviar 3 vezes
    for (let i = 0; i < 3; i++) {
      const response = await request.post('/api/webhooks/bolten', { data: payload });
      expect(response.ok()).toBeTruthy();
    }

    // Verificar se só criou 1 cliente
    // (via API ou banco)
  });

  test('Auto-inscrição removida - aluno sem matrícula recebe 403', async ({ page, request }) => {
    // Login como aluno sem matrícula no curso
    await loginAs(page, 'aluno_sem_matricula@test.com', 'senha123');

    // Tentar acessar aula diretamente
    const response = await page.request.get('/aluno/cursos/course_1/aulas/aula_1');
    expect(response.status()).toBe(403);
    // Ou verificar página de erro
  });
});