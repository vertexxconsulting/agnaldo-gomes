export async function uploadAdminImage(
  file: File,
  folder: 'loja' | 'estoque' = 'loja'
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || 'Falha ao enviar a imagem.');
  }

  return String(data.url);
}
