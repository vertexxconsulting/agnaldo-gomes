import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { mensagem, config } = await req.json();

    if (!mensagem) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Retorna uma flag indicando que não há chave configurada
      return NextResponse.json({ 
        error: 'Chave da API da OpenAI não configurada nas variáveis de ambiente da Vercel.',
        missingApiKey: true
      }, { status: 503 });
    }

    // Montar o System Prompt com as diretrizes
    const systemPrompt = `
Você é a inteligência artificial executiva do Studio de Beleza & Academy Agnaldo Gomes.
Tom de voz: ${config?.tomDeVoz || 'Elegante, consultivo, acolhedor e focado em excelência.'}

DIRETRIZES MESTRE:
${config?.diretrizesMestre || ''}

REGRAS DO SALÃO:
${config?.modulos?.salao?.regrasAgendamento || ''}
${config?.modulos?.salao?.regrasNoivas || ''}

REGRAS DA ACADEMY:
${config?.modulos?.academy?.regrasCursos || ''}
${config?.modulos?.academy?.regrasSuporteAlunos || ''}

REGRAS DA LOJA:
${config?.modulos?.loja?.regrasProdutos || ''}

ATENDENTE FÍSICA:
${config?.atendenteFisica?.dicasGerais || ''}

Responda à solicitação do usuário de forma útil e direta, seguindo estritamente as diretrizes acima.
    `.trim();

    // Fazer a chamada para a OpenAI
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mensagem }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiRes.ok) {
      const errorData = await openaiRes.json();
      console.error('Erro na API da OpenAI:', errorData);
      throw new Error(errorData.error?.message || 'Erro ao conectar com a OpenAI');
    }

    const data = await openaiRes.json();
    const respostaIA = data.choices[0]?.message?.content || 'Desculpe, não consegui formular uma resposta.';

    return NextResponse.json({ resposta: respostaIA });

  } catch (error: any) {
    console.error('Erro na rota /api/chat:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
