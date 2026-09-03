import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from '@/lib/api-auth';
import crypto from 'crypto';

// Usar Service Role Key para garantir que possamos fazer upload
// mesmo se as políticas (RLS) estiverem restritas no storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    
    // Validar se o usuário é admin
    if (!session || (session.role !== 'academy_admin' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as string || 'academy-assets';
    const folder = formData.get('folder') as string || 'covers';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Gerar nome de arquivo único
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Obter extensão original ou forçar .webp se foi convertido no client
    const ext = file.name.split('.').pop() || 'webp';
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileName = `${folder}/${Date.now()}-${uniqueId}.${ext}`;

    // Fazer upload para o Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Erro no upload para Supabase Storage:', error);
      return NextResponse.json({ error: 'Erro ao fazer upload do arquivo.', details: error.message }, { status: 500 });
    }

    // Gerar URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl, path: data.path });
  } catch (error: any) {
    console.error('Erro inesperado no upload:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.', details: error.message }, { status: 500 });
  }
}
