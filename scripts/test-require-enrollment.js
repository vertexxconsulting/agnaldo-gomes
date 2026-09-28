/**
 * Teste Unitário: Simulação de Verificação de Matrícula (requireEnrollment)
 * e Proteção de Rota de Aulas (/aluno/cursos/:cursoId/aulas/:aulaId)
 * 
 * Executar com: node scripts/test-require-enrollment.js
 */

const assert = require('assert');

// 1. Simulação da função requireEnrollment (lógica idêntica a lib/api-auth.ts)
async function simulateRequireEnrollment({ user, enrollmentExists, dbError = null }) {
  // Simula requireAlunoAuth
  if (!user) {
    return {
      error: { status: 401, message: 'Não autenticado' },
      user: null,
    };
  }

  const allowedRoles = ['aluno', 'academy_admin', 'studio_admin', 'ADMIN'];
  if (!allowedRoles.includes(user.role)) {
    return {
      error: { status: 403, message: 'Acesso negado: permissão insuficiente' },
      user: null,
    };
  }

  // Regra 1: Administradores e gestores do Academy/Studio têm acesso irrestrito
  if (user.role === 'ADMIN' || user.role === 'academy_admin' || user.role === 'studio_admin') {
    return { error: null, user };
  }

  // Simula consulta a tabela course_enrollments
  if (dbError) {
    return {
      error: { status: 500, message: 'Erro ao verificar acesso ao curso' },
      user: null,
    };
  }

  // Regra 2: Aluno SEM matrícula ativa no curso -> Retorna 403 (SEM auto-inscrição!)
  if (!enrollmentExists) {
    return {
      error: {
        status: 403,
        message: 'Você não tem acesso a este curso. Faça a matrícula primeiro.',
      },
      user: null,
    };
  }

  // Regra 3: Aluno COM matrícula ativa -> Acesso liberado
  return { error: null, user };
}

// 2. Simulação da renderização da página de aula (app/aluno/(logged)/cursos/[cursoId]/aulas/[aulaId]/page.tsx)
async function simulatePageEpisodioWrapper(authResult, cursoId, aulaId) {
  if (authResult.error) {
    if (authResult.error.status === 401) {
      return {
        rendered: 'LOGIN_REQUIRED_UI',
        httpStatus: 401,
        canWatchVideo: false,
      };
    }
    if (authResult.error.status === 403) {
      return {
        rendered: 'MATRICULA_NECESSARIA_UI',
        httpStatus: 403,
        cursoId,
        mensagem: authResult.error.message,
        canWatchVideo: false, // Player de vídeo NÃO é exibido
      };
    }
  }

  // Apenas alunos matriculados ou admins chegam aqui
  return {
    rendered: 'LESSON_PLAYER_UI',
    httpStatus: 200,
    cursoId,
    aulaId,
    canWatchVideo: true,
  };
}

// 3. Execução da Suíte de Testes
async function runTests() {
  console.log('🧪 Iniciando testes de requireEnrollment e proteção de rotas...\n');

  const cursoId = '78eb5d8d-2925-4454-8ea3-cb23cca61de0';
  const aulaId = 'c477d14a-9edc-454b-9c21-72f81e6ef06f';

  // --------------------------------------------------------------------------
  // TESTE 1: Aluno SEM matrícula tentando acessar a aula
  // --------------------------------------------------------------------------
  {
    console.log('▶ Teste 1: Aluno SEM matrícula tentando acessar a aula');
    const alunoSemMatricula = { id: 'usr_aluno_1', role: 'aluno', email: 'aluno@teste.com' };
    
    const auth = await simulateRequireEnrollment({
      user: alunoSemMatricula,
      enrollmentExists: false,
    });

    assert.strictEqual(auth.error?.status, 403, 'Deve retornar erro 403');
    assert.strictEqual(
      auth.error?.message,
      'Você não tem acesso a este curso. Faça a matrícula primeiro.'
    );
    assert.strictEqual(auth.user, null, 'User não deve ser liberado no resultado de sucesso');

    const pageResult = await simulatePageEpisodioWrapper(auth, cursoId, aulaId);
    assert.strictEqual(pageResult.rendered, 'MATRICULA_NECESSARIA_UI');
    assert.strictEqual(pageResult.canWatchVideo, false, 'Aluno sem matrícula NÃO pode ver o vídeo');
    console.log('  ✅ Bloqueado com sucesso com 403 e tela de matrícula necessária!\n');
  }

  // --------------------------------------------------------------------------
  // TESTE 2: Aluno COM matrícula ativa tentando acessar a aula
  // --------------------------------------------------------------------------
  {
    console.log('▶ Teste 2: Aluno COM matrícula ativa no curso');
    const alunoComMatricula = { id: 'usr_aluno_2', role: 'aluno', email: 'matriculado@teste.com' };

    const auth = await simulateRequireEnrollment({
      user: alunoComMatricula,
      enrollmentExists: true,
    });

    assert.strictEqual(auth.error, null, 'Não deve retornar erro');
    assert.strictEqual(auth.user?.id, 'usr_aluno_2');

    const pageResult = await simulatePageEpisodioWrapper(auth, cursoId, aulaId);
    assert.strictEqual(pageResult.rendered, 'LESSON_PLAYER_UI');
    assert.strictEqual(pageResult.canWatchVideo, true, 'Aluno matriculado pode assistir ao vídeo');
    console.log('  ✅ Acesso liberado para aluno matriculado (Player exibido)!\n');
  }

  // --------------------------------------------------------------------------
  // TESTE 3: Administrador acessando curso SEM registro em course_enrollments
  // --------------------------------------------------------------------------
  {
    console.log('▶ Teste 3: Administrador / Gestor sem matrícula (acesso irrestrito)');
    const adminUser = { id: 'usr_admin_1', role: 'ADMIN', email: 'admin@agnaldo.com' };

    const auth = await simulateRequireEnrollment({
      user: adminUser,
      enrollmentExists: false, // Admin não precisa de matrícula na tabela
    });

    assert.strictEqual(auth.error, null, 'Admin não deve ter erro 403');
    assert.strictEqual(auth.user?.role, 'ADMIN');

    const pageResult = await simulatePageEpisodioWrapper(auth, cursoId, aulaId);
    assert.strictEqual(pageResult.rendered, 'LESSON_PLAYER_UI');
    assert.strictEqual(pageResult.canWatchVideo, true);
    console.log('  ✅ Administrador acessou com sucesso com bypass de permissão!\n');
  }

  // --------------------------------------------------------------------------
  // TESTE 4: Usuário não autenticado
  // --------------------------------------------------------------------------
  {
    console.log('▶ Teste 4: Usuário não autenticado');
    const auth = await simulateRequireEnrollment({
      user: null,
      enrollmentExists: false,
    });

    assert.strictEqual(auth.error?.status, 401, 'Deve retornar erro 401');
    const pageResult = await simulatePageEpisodioWrapper(auth, cursoId, aulaId);
    assert.strictEqual(pageResult.rendered, 'LOGIN_REQUIRED_UI');
    assert.strictEqual(pageResult.canWatchVideo, false);
    console.log('  ✅ Redirecionamento/tela de login acionada com 401!\n');
  }

  console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
}

runTests().catch(err => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
