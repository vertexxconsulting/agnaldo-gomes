import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { accessToken } = await req.json();
    const token = (accessToken || '').trim();

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Token não informado' }, { status: 400 });
    }

    // Valida o token contra a API do Mercado Pago no backend (evita bloqueios de CORS)
    // Funciona tanto para credenciais de teste (TEST-...) quanto de produção (APP_USR-...)
    const res = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const isTest = token.startsWith('TEST-');
      return NextResponse.json({
        ok: true,
        isTest,
        message: isTest
          ? 'Token de teste (Sandbox) válido e conectado!'
          : 'Token de produção válido e conectado!',
      });
    }

    // Tenta fallback com /users/me caso payment_methods tenha restrição específica
    const userRes = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (userRes.ok) {
      const isTest = token.startsWith('TEST-');
      return NextResponse.json({
        ok: true,
        isTest,
        message: isTest
          ? 'Token de teste (Sandbox) válido e conectado!'
          : 'Token de produção válido e conectado!',
      });
    }

    const errData = await res.json().catch(() => null);
    return NextResponse.json(
      {
        ok: false,
        error: errData?.message || 'Token inválido ou expirado no Mercado Pago.',
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha na verificação do token';
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
