import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    const auth = await requireAuth([
      'studio_admin',
      'loja_admin',
      'academy_admin',
      'studio_secretaria',
    ]);
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawFolder = String(formData.get('folder') || 'loja').replace(/[^a-zA-Z0-9_-]/g, '');
    const folder = rawFolder || 'loja';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Envie apenas arquivos de imagem (PNG, JPG, WEBP).' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Imagem muito grande. O tamanho máximo permitido é 5MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extFromName = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    const ext = extFromName && /^[a-z0-9]{2,5}$/.test(extFromName) ? extFromName : 'webp';
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileName = `${folder}/${Date.now()}-${uniqueId}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from('academy-assets')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[api/admin/upload] Erro no Supabase Storage:', error);
      return NextResponse.json(
        { error: 'Erro ao fazer upload da imagem.', details: error.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('academy-assets').getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl, path: data.path });
  } catch (error: unknown) {
    console.error('[api/admin/upload] Erro inesperado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
