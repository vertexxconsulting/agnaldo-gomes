import { NextResponse } from 'next/server';
import { enviarTexto } from '@/lib/evolution';

export async function POST(request: Request) {
  try {
    const { numero, texto } = await request.json();

    if (!numero) {
      return NextResponse.json({ error: 'Número de telefone é obrigatório' }, { status: 400 });
    }

    const mensagemTexto = (texto && typeof texto === 'string' && texto.trim()) 
      ? texto.trim() 
      : `✨ *Studio Agnaldo Gomes* ✨\n\nOlá! Esta é uma mensagem de confirmação do sistema.\nA sua conexão com o WhatsApp está operando com 100% de sucesso! 🚀\n\n📲 *Status:* Conectado e ativo\n⏰ *Lembretes de agendamento:* Habilitados`;

    const resultado = await enviarTexto(numero.replace(/\D/g, ''), mensagemTexto);

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error || 'Erro ao enviar mensagem via Evolution API' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Mensagem enviada com sucesso!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

