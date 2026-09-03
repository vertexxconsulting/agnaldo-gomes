'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { optimizeImage } from '@/lib/image-optimizer';
import Image from 'next/image';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, folder = 'covers', className = '' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar se é imagem
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem (JPG, PNG).');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      // 1. Otimizar a imagem no cliente (converte para WebP, max 1280px, 80% qualidade)
      const optimizedFile = await optimizeImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.8 });

      // 2. Preparar o FormData
      const formData = new FormData();
      formData.append('file', optimizedFile);
      formData.append('folder', folder);
      formData.append('bucket', 'academy-assets');

      // 3. Fazer o Upload para o nosso backend
      const res = await fetch('/api/admin-academy/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao fazer upload da imagem.');
      }

      const data = await res.json();
      
      // 4. Atualizar o form pai com a URL retornada
      if (data.url) {
        onChange(data.url);
      } else {
        throw new Error('A resposta do servidor não retornou a URL.');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao fazer upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className={`w-full ${className}`}>
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--background)]">
          <div className="aspect-video relative w-full h-40">
            <Image 
              src={value} 
              alt="Capa" 
              fill 
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={handleRemove}
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transform scale-90 group-hover:scale-100 transition-all"
                title="Remover Imagem"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="border-2 border-dashed border-[var(--border-subtle)] hover:border-primary transition-colors rounded-lg bg-[var(--color-card)] p-6 flex flex-col items-center justify-center cursor-pointer min-h-[160px]"
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-primary">
              <Loader2 className="animate-spin mb-2" size={32} />
              <span className="text-sm font-medium">Otimizando e subindo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-foreground/60 hover:text-primary transition-colors">
              <Upload size={32} className="mb-2" />
              <span className="text-sm font-medium text-center">Clique para escolher uma capa</span>
              <span className="text-xs text-foreground/40 mt-1">JPG, PNG, GIF (Será convertido p/ WebP)</span>
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept="image/*"
            className="hidden" 
          />
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
