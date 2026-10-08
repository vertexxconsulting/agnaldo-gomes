import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { getAllNicknames, setUserNickname } from '@/lib/nicknames';

export async function GET() {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const nicknames = await getAllNicknames();
    return NextResponse.json({ nicknames });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { email, nickname } = body;

    if (!email || !nickname) {
      return NextResponse.json({ error: 'E-mail e nickname são obrigatórios' }, { status: 400 });
    }

    const res = await setUserNickname(email, nickname);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Nickname atualizado com sucesso!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
