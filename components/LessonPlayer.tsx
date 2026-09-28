'use client';

/**
 * LessonPlayer — componente de player de vídeo com suporte multi-plataforma:
 * - Vimeo (iframe embed com parâmetros de privacidade e marca)
 * - YouTube (iframe embed)
 * - MP4 direto (tag <video>)
 * 
 * NOVO: Rastreia tempo de exibição e só marca como concluído após 90%
 * Envia progresso a cada 30s (debounce) para lesson_progress.assistido_segundos
 */
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';

export interface LessonPlayerProps {
  videoUrl: string;
  poster?: string;
  title?: string;
  className?: string;
  lessonId?: string;
  durationMinutes?: number;
  onProgress?: (seconds: number) => void;
  onComplete?: () => void;
}

function extractVimeoData(url: string): { id: string; hash?: string } | null {
  if (!url) return null;
  const idMatch = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/|^)(\d+)/);
  if (!idMatch) return null;
  const id = idMatch[1];

  const hashParam = url.match(/[?&]h=([a-zA-Z0-9]+)/);
  const slashHash = url.match(new RegExp(`(?:vimeo\\.com\\/(?:video\\/)?|player\\.vimeo\\.com\\/video\\/)${id}\\/([a-zA-Z0-9]+)`));
  const hash = hashParam?.[1] || slashHash?.[1];

  return { id, hash };
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return m ? m[1] : null;
}

function extractBunnyData(url: string): { libraryId: string; videoId: string } | null {
  if (!url) return null;
  // Match iframe.mediadelivery.net/embed/LIB_ID/VID_ID or video.bunnycdn.com/play/LIB_ID/VID_ID
  const match = url.match(/(?:mediadelivery\.net\/embed|video\.bunnycdn\.com\/play)\/([^\/]+)\/([^\/?]+)/);
  if (match) {
    return { libraryId: match[1], videoId: match[2] };
  }
  return null;
}

export function LessonPlayer({ 
  videoUrl, 
  poster, 
  title, 
  className, 
  lessonId,
  durationMinutes,
  onProgress,
  onComplete,
}: LessonPlayerProps) {
  const vimeoData = useMemo(() => extractVimeoData(videoUrl), [videoUrl]);
  const youtubeId = useMemo(() => extractYouTubeId(videoUrl), [videoUrl]);
  const bunnyData = useMemo(() => extractBunnyData(videoUrl), [videoUrl]);

  const variant = useMemo(() => {
    if (!videoUrl) return 'none';
    if (vimeoData) return 'vimeo';
    if (youtubeId) return 'youtube';
    if (bunnyData) return 'bunny';
    return 'mp4';
  }, [videoUrl, vimeoData, youtubeId, bunnyData]);

  // Estado para rastreamento de tempo (apenas para MP4 nativo)
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [progressSent, setProgressSent] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef(0);

  // Calcular tempo total esperado em segundos
  const totalExpectedSeconds = useMemo(() => {
    return durationMinutes ? durationMinutes * 60 : 0;
  }, [durationMinutes]);

  // Threshold de 90% para considerar concluído
  const completionThreshold = useMemo(() => {
    return totalExpectedSeconds * 0.9;
  }, [totalExpectedSeconds]);

  // Função para enviar progresso para o servidor (debounced)
  const sendProgress = useCallback(async (seconds: number) => {
    if (!lessonId || seconds <= lastSentRef.current) return;
    
    // Debounce: só envia se passou 30s desde o último envio
    const now = Date.now();
    if (now - progressSent < 30000) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('lesson_progress')
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            assistido_segundos: seconds,
            // completed só será true quando atingir 90%
            completed: seconds >= completionThreshold,
            completed_at: seconds >= completionThreshold ? new Date().toISOString() : null,
          }, {
            onConflict: 'user_id,lesson_id',
          });
        
        lastSentRef.current = seconds;
        setProgressSent(now);
        
        // Callback local para UI
        onProgress?.(seconds);
        
        // Disparar onComplete se atingiu threshold
        if (seconds >= completionThreshold && !isCompleted) {
          setIsCompleted(true);
          onComplete?.();
        }
      }
    } catch (error) {
      console.error('[LessonPlayer] Erro ao enviar progresso:', error);
    }
  }, [lessonId, completionThreshold, onProgress, onComplete, isCompleted]);

  // Para MP4 nativo: rastrear eventos de tempo
  useEffect(() => {
    if (variant !== 'mp4') return;
    
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      sendProgress(Math.floor(video.currentTime));
    };

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
    };

    const handleEnded = () => {
      sendProgress(Math.floor(video.duration));
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [variant, sendProgress]);

  // Para Vimeo/YouTube/Bunny: não podemos rastrear tempo real via iframe
  // Mas podemos estimar baseado no tempo que o componente fica montado
  // OU usar postMessage se o player suportar (Vimeo Player API, YouTube IFrame API)
  // Por simplicidade, vamos usar uma aproximação baseada no tempo de montagem
  useEffect(() => {
    if (variant !== 'vimeo' && variant !== 'youtube' && variant !== 'bunny') return;
    if (!lessonId || !totalExpectedSeconds) return;

    const startTime = Date.now();
    let intervalId: NodeJS.Timeout;

    const estimateAndSend = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const estimated = Math.min(elapsed, totalExpectedSeconds);
      sendProgress(estimated);
    };

    // Enviar a cada 30 segundos
    intervalId = setInterval(estimateAndSend, 30000);
    estimateAndSend(); // Envio inicial

    return () => {
      clearInterval(intervalId);
      // Envio final ao desmontar
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      sendProgress(Math.min(elapsed, totalExpectedSeconds));
    };
  }, [variant, lessonId, totalExpectedSeconds, sendProgress]);

  // Renderização
  if (variant === 'none') {
    return (
      <div className={`w-full aspect-video bg-foreground flex flex-col items-center justify-center text-white/50 ${className ?? ''}`}>
        <p className="text-sm">Nenhum vídeo disponível para esta aula.</p>
      </div>
    );
  }

  if (variant === 'vimeo' && vimeoData) {
    const vimeoSrc = `https://player.vimeo.com/video/${vimeoData.id}?title=0&byline=0&portrait=0&badge=0&autoplay=0&responsive=1${vimeoData.hash ? `&h=${vimeoData.hash}` : ''}`;
    return (
      <div className={className ?? ''}>
        <iframe
          src={vimeoSrc}
          className="w-full aspect-video"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title ?? 'Aula'}
        />
        {totalExpectedSeconds > 0 && (
          <div className="mt-2 text-xs text-white/50 text-center">
            Tempo estimado: {Math.floor(totalExpectedSeconds / 60)} min • Conclusão em 90%
          </div>
        )}
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
        {totalExpectedSeconds > 0 && (
          <div className="mt-2 text-xs text-white/50 text-center">
            Tempo estimado: {Math.floor(totalExpectedSeconds / 60)} min • Conclusão em 90%
          </div>
        )}
      </div>
    );
  }

  if (variant === 'bunny' && bunnyData) {
    return (
      <div className={className ?? ''}>
        <iframe
          src={`https://iframe.mediadelivery.net/embed/${bunnyData.libraryId}/${bunnyData.videoId}?autoplay=false&preload=true`}
          className="w-full aspect-video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title ?? 'Aula'}
        />
        {totalExpectedSeconds > 0 && (
          <div className="mt-2 text-xs text-white/50 text-center">
            Tempo estimado: {Math.floor(totalExpectedSeconds / 60)} min • Conclusão em 90%
          </div>
        )}
      </div>
    );
  }

  // MP4 nativo com rastreamento real
  return (
    <div className={className ?? ''}>
      <video
        ref={videoRef}
        controls
        className="w-full h-full object-contain"
        poster={poster}
        src={videoUrl}
      />
      {totalExpectedSeconds > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Progresso: {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(totalExpectedSeconds / 60)}:{String(Math.floor(totalExpectedSeconds % 60)).padStart(2, '0')}</span>
            <span>{totalExpectedSeconds > 0 ? Math.round((currentTime / totalExpectedSeconds) * 100) : 0}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                currentTime >= completionThreshold ? 'bg-green-500' : 'bg-gold'
              }`}
              style={{ width: `${Math.min(100, (currentTime / totalExpectedSeconds) * 100)}%` }}
            />
          </div>
          {currentTime >= completionThreshold && (
            <p className="text-xs text-green-500 mt-1 text-center">✓ Tempo mínimo atingido — aula será marcada como concluída</p>
          )}
        </div>
      )}
    </div>
  );
}