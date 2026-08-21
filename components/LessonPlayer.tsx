'use client';

/**
 * LessonPlayer — componente de player de vídeo com suporte multi-plataforma:
 * - Vimeo (iframe embed com parâmetros de privacidade e marca)
 * - YouTube (iframe embed)
 * - MP4 direto (tag <video>)
 *
 * Detecção automática pela URL em aulaAtual.videoUrl.
 * Recomendação Vimeo: em Configurações do vídeo > Privacidade, permita
 * "Embutir" e restrinja aos domínios do seu site.
 */
import { useMemo } from 'react';

export interface LessonPlayerProps {
  videoUrl: string;
  poster?: string;
  title?: string;
  className?: string;
}

function extractVimeoId(url: string): string | null {
  // Suporta: vimeo.com/123456789, player.vimeo.com/video/123456789, ou apenas o ID
  const m = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/|^)(\d+)/);
  return m ? m[1] : null;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return m ? m[1] : null;
}

export function LessonPlayer({ videoUrl, poster, title, className }: LessonPlayerProps) {
  const variant = useMemo(() => {
    if (!videoUrl) return 'none';
    if (extractVimeoId(videoUrl)) return 'vimeo';
    if (extractYouTubeId(videoUrl)) return 'youtube';
    return 'mp4';
  }, [videoUrl]);

  const vimeoId = extractVimeoId(videoUrl);
  const youtubeId = extractYouTubeId(videoUrl);

  if (variant === 'none') {
    return (
      <div className={`w-full aspect-video bg-black flex flex-col items-center justify-center text-white/50 ${className ?? ''}`}>
        <p className="text-sm">Nenhum vídeo disponível para esta aula.</p>
      </div>
    );
  }

  if (variant === 'vimeo' && vimeoId) {
    return (
      <div className={className ?? ''}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&badge=0&autoplay=0&responsive=1`}
          className="w-full aspect-video"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title ?? 'Aula'}
        />
      </div>
    );
  }

  if (variant === 'youtube' && youtubeId) {
    return (
      <div className={className ?? ''}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`}
          className="w-full aspect-video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={title ?? 'Aula'}
        />
      </div>
    );
  }

  return (
    <div className={className ?? ''}>
      <video
        controls
        className="w-full h-full object-contain"
        poster={poster}
        src={videoUrl}
      />
    </div>
  );
}
