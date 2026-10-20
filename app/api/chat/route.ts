import { NextResponse } from 'next/server';
import { responderDuvidaComTutorial, BASE_CONHECIMENTO_TUTORIAL } from '@/lib/knowledge-base';

export async function POST(req: Request) {
  try {
    const { mensagem, config } = await req.json();

    if (!mensagem || typeof mensagem !== 'string') {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    // Se a chave não estiver configurada no ambiente, responde com base no Manual e Tutorial do Sistema
    if (!apiKey) {
      const respostaTutorial = responderDuvidaComTutorial(mensagem);
      return NextResponse.json({ 
        resposta: respostaTutorial,
        source: 'tutorial_knowledge_base',
        missingApiKey: true
      });
    }

    // Resumo dos tópicos da base de conhecimento para enriquecer o contexto da OpenAI
    const manualContexto = BASE_CONHECIMENTO_TUTORIAL.map(t => {
      const passos = t.passoAPasso.map(p => `${p.passo}. ${p.titulo}: ${p.detalhes}`).join('\n');
      return `--- ${t.titulo} ---\n${t.descricao}\n${passos}`;
    }).join('\n\n');

    // Montar o System Prompt completo
    const systemPrompt = `
Você é a inteligência artificial executiva e consultora de processos do Studio de Beleza & Academy Agnaldo Gomes.
Tom de voz: ${config?.tomDeVoz || 'Elegante, consultivo, acolhedor e focado em excelência capilar e estética de alto padrão.'}

DIRETRIZES MESTRE DO STUDIO:
1. VALORES SEMPRE "A PARTIR DE": Todos os preços informados devem usar a expressão "a partir de" (ex: Corte Masculino com Agnaldo Gomes a partir de R$ 60,00; Mechas a partir de R$ 480,00).
2. POLÍTICA DE NOIVAS: Serviços para noivas exigem pagamento obrigatório de 50% de sinal via PIX para reserva e bloqueio de data exclusiva na agenda do mestre Agnaldo Gomes.
3. SEGREGAÇÃO DE PERFIS: A Secretária faz o Fechamento Prévio da comanda e liberação no balcão sem ter acesso às comissões da equipe nem ao Demonstrativo da Gestora. A Gestora do Salão e o Admin auditam e confirmam o financeiro definitivo em /admin/pagamentos.
4. INSUMOS EM TEMPO REAL: Os profissionais lançam insumos consumidos na cadeira (descoloração, tonalização, etc.) informando a dosagem em g/ml através do seletor inteligente com busca por digitação. Se errarem, podem editar (✏️) e o sistema debita ou estorna o estoque automaticamente.
5. UPSELL: Profissionais ganham comissão vendendo produtos home care na cadeira através do "Vender Produto (Upsell)".
6. ACADEMY: Cursos presenciais, VIP e online com certificados digitais autenticados com QR Code (/verificar-certificado).
7. MERCADO LIVRE: Equipamentos de alta tecnologia são afiliados com link oficial do Mercado Livre (botão "Ver Oferta"). Cosméticos de prateleira são do estoque local com carrinho próprio.

BASE DE CONHECIMENTO OFICIAL E TUTORIAL DO SISTEMA:
${manualContexto}

Responda à dúvida do usuário de forma clara, didática, bem estruturada em tópicos e com passos práticos, sempre alinhado com as regras acima.
    `.trim();

    // Chamada para a API da OpenAI
    try {
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
          max_tokens: 700,
        }),
      });

      if (!openaiRes.ok) {
        console.warn('[api/chat] Erro retornado pela OpenAI, aplicando fallback do tutorial');
        const respostaTutorial = responderDuvidaComTutorial(mensagem);
        return NextResponse.json({ 
          resposta: respostaTutorial,
          source: 'tutorial_fallback',
          openaiStatus: openaiRes.status
        });
      }

      const data = await openaiRes.json();
      const respostaIA = data.choices?.[0]?.message?.content || responderDuvidaComTutorial(mensagem);

      return NextResponse.json({ resposta: respostaIA, source: 'openai' });

    } catch (openaiErr) {
      console.warn('[api/chat] Exceção na conexão OpenAI, aplicando fallback do tutorial:', openaiErr);
      const respostaTutorial = responderDuvidaComTutorial(mensagem);
      return NextResponse.json({ 
        resposta: respostaTutorial,
        source: 'tutorial_fallback'
      });
    }

  } catch (error: any) {
    console.error('Erro na rota /api/chat:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
