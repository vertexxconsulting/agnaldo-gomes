import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { getAllProfiles, updateUserRole, createAdminUser } from '@/lib/admin-users';

export async function GET() {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const profiles = await getAllProfiles('STUDENT');
    return NextResponse.json(profiles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    
    // Se vier userId, é atualização de role
    if (body.userId) {
      const { userId, newRole, permissions } = body;
      await updateUserRole(userId, newRole, permissions);
      return NextResponse.json({ success: true });
    } 
    
    // Se vier email/password, é criação de usuário
    if (body.email && body.password) {
      const { email, full_name, password, role, permissions } = body;
      const result = await createAdminUser({ email, full_name, password, role, permissions });
      return NextResponse.json({ success: true, user: result.user });
    }

    return NextResponse.json({ error: 'Dados insuficientes para a operação' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
