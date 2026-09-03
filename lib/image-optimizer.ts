/**
 * Utilitário para redimensionar e comprimir imagens no lado do cliente
 * antes de fazer o upload para o servidor.
 */

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 a 1
}

export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<File> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.8 } = options;

  // Se não for imagem, retorna o original (embora devêssemos restringir no input)
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;

      // Calcular novas dimensões mantendo o aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Falha ao obter contexto 2D do Canvas'));
      }

      // Preencher o fundo de branco no caso de PNGs transparentes virarem WebP/JPEG (opcional, mas recomendado)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Desenhar a imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Converter para WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Falha ao converter canvas para Blob'));
          }

          // Criar um novo File com a extensão correta
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + '.webp';
          const optimizedFile = new File([blob], newFileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          resolve(optimizedFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar a imagem para otimização'));
    };

    img.src = url;
  });
}
