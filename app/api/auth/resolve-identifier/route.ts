import { NextResponse } from 'next/server';
import { resolveIdentifierToEmail } from '@/lib/nicknames';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier } = body;

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json(
        { error: 'Identificador não fornecido' },
        { status: 400 }
      );
    }

    const result = await resolveIdentifierToEmail(identifier);

    if (!result.email) {
      return NextResponse.json(
        { 
          error: 'Nickname ou e-mail não encontrado. Verifique o nome digitado ou use seu e-mail cadastrado.',
          found: false 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      found: true,
      email: result.email,
      full_name: result.full_name,
      source: result.source
    });

  } catch (error: any) {
    console.error('Erro na rota /api/auth/resolve-identifier:', error);
    return NextResponse.json(
      { error: 'Erro interno ao resolver identificador' },
      { status: 500 }
    );
  }
}
