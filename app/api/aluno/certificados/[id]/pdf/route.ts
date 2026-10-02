import { NextResponse } from 'next/server';
import { requireAlunoAuth } from '@/lib/api-auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAlunoAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    // 1. Fetch certificate data
    const { data: cert, error: certError } = await auth.supabase!
      .from('course_certificates')
      .select(`
        id,
        certificate_number,
        verification_hash,
        issued_at,
        user_id,
        profiles ( full_name ),
        courses ( title, certificate_bg_url )
      `)
      .eq('id', id)
      .single();

    if (certError || !cert) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
    }

    // Apenas o dono ou um admin pode baixar (se fosse admin, usaria auth bypass, mas aqui é auth de aluno. Entao verifica o ID)
    // Para simplificar, como usamos requireStudentAuth, o supabase Client está atrelado ao Auth do usuário (RLS resolve isso).
    // O RLS (Users view own certificates) já garante que só o dono consegue fazer esse SELECT.

    if (!cert.courses?.certificate_bg_url) {
      // Retorna uma página de erro simpática ou texto
      return new NextResponse('Este curso ainda não possui um modelo de certificado configurado.', { status: 400 });
    }

    // 2. Load the background image
    const bgUrl = cert.courses.certificate_bg_url;
    let imageBytes: ArrayBuffer;
    try {
      const imgRes = await fetch(bgUrl);
      if (!imgRes.ok) throw new Error('Failed to fetch image');
      imageBytes = await imgRes.arrayBuffer();
    } catch (e) {
      return new NextResponse('Erro ao carregar a imagem de fundo do certificado.', { status: 500 });
    }

    // 3. Create PDF
    const pdfDoc = await PDFDocument.create();
    
    // Suportar JPG ou PNG
    let bgImage;
    if (bgUrl.toLowerCase().endsWith('.png') || bgUrl.includes('image/png')) {
      bgImage = await pdfDoc.embedPng(imageBytes);
    } else {
      bgImage = await pdfDoc.embedJpg(imageBytes);
    }

    // Pegar dimensões da imagem original
    const imgDims = bgImage.scale(1);
    
    // Criar página com o tamanho exato da imagem
    const page = pdfDoc.addPage([imgDims.width, imgDims.height]);
    
    page.drawImage(bgImage, {
      x: 0,
      y: 0,
      width: imgDims.width,
      height: imgDims.height,
    });

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Informações para escrever
    const studentName = cert.profiles?.full_name?.toUpperCase() || 'ALUNO NÃO IDENTIFICADO';
    const courseName = cert.courses?.title?.toUpperCase() || 'CURSO';
    
    const dateObj = new Date(cert.issued_at);
    const dateStr = dateObj.toLocaleDateString('pt-BR');
    
    const certNumber = cert.certificate_number;
    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/verificar-certificado?hash=${cert.verification_hash}`;

    // Helper: desenha texto centralizado
    const drawCenteredText = (text: string, yPos: number, size: number, f: any, colorHex: string = '#D4AF37') => {
      const textWidth = f.widthOfTextAtSize(text, size);
      const x = (imgDims.width - textWidth) / 2;
      
      // converter hex pra rgb normalizado (0 a 1)
      const r = parseInt(colorHex.slice(1, 3), 16) / 255;
      const g = parseInt(colorHex.slice(3, 5), 16) / 255;
      const b = parseInt(colorHex.slice(5, 7), 16) / 255;

      page.drawText(text, {
        x,
        y: yPos,
        size,
        font: f,
        color: rgb(r, g, b),
      });
    };

    // Ajuste esses valores de posição Y conforme o layout padrão do certificado
    // Aqui usamos porcentagens baseadas na altura da imagem para garantir escala
    
    // NOME DO ALUNO (Centro)
    drawCenteredText(studentName, imgDims.height * 0.45, imgDims.height * 0.05, font, '#000000');
    
    // NOME DO CURSO
    drawCenteredText(courseName, imgDims.height * 0.30, imgDims.height * 0.035, font, '#D4AF37');

    // DATA DE CONCLUSÃO (Canto inferior)
    page.drawText(`Concluído em: ${dateStr}`, {
      x: imgDims.width * 0.1,
      y: imgDims.height * 0.15,
      size: imgDims.height * 0.018,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });

    // CÓDIGO E LINK DE VERIFICAÇÃO (Rodapé)
    page.drawText(`Cód: ${certNumber}`, {
      x: imgDims.width * 0.1,
      y: imgDims.height * 0.08,
      size: imgDims.height * 0.015,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Valide em: ${verificationUrl}`, {
      x: imgDims.width * 0.1,
      y: imgDims.height * 0.05,
      size: imgDims.height * 0.015,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();

    // 4. Return the PDF response
    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Certificado_${certNumber}.pdf"`,
      },
    });

  } catch (err) {
    console.error('[api/aluno/certificados/pdf] Erro ao gerar PDF:', err);
    return new NextResponse('Erro interno ao gerar certificado', { status: 500 });
  }
}
