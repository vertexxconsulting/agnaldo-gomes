'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
}

export function VideoPlayer({ courseId }: { courseId: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('academy_videos')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setVideos(data as Video[]);
      }
      setIsLoading(false);
    };

    if (courseId) {
      fetchVideos();
    }
  }, [courseId]);

  if (isLoading) {
    return <div className="flex justify-center p-8"><span className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (videos.length === 0) {
    return <div className="text-center p-8 text-foreground/60">Nenhum vídeo encontrado para este curso.</div>;
  }

  return (
    <div className="space-y-8">
      {videos.map((video) => (
        <div key={video.id} className="bg-[var(--color-card)] border rounded-2xl overflow-hidden shadow-sm">
          <div className="relative w-full aspect-video bg-foreground">
            <iframe
              src={video.video_url}
              frameBorder="0"
              allowFullScreen
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              className="absolute inset-0 w-full h-full"
            />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-2 text-foreground">{video.title}</h3>
            {video.description && (
              <p className="text-sm text-foreground/70 leading-relaxed">{video.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
