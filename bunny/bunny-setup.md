# 🎬 Setup Bunny Video Upload Automático

## **1. Pré-requisitos**

```bash
npm install axios @supabase/supabase-js ts-node typescript
```

## **2. Configurar variáveis de ambiente**

Crie arquivo `.env` na raiz:

```env
BUNNY_API_KEY=seu_api_key_aqui
BUNNY_LIBRARY_ID=seu_library_id_aqui
SUPABASE_URL=sua_url_supabase
SUPABASE_KEY=sua_chave_supabase
```

### **Como pegar essas chaves:**

#### **Bunny API Key:**
1. Vai em https://bunny.net
2. Dashboard → Account → API Key (copia)

#### **Bunny Library ID:**
1. Dashboard → Video Library
2. Vê o número no URL: `stream.bunny.net/library/123456`
3. Aquele número é o ID

#### **Supabase:**
1. Projeto → Settings → API
2. Copia `Project URL` e `anon key`

---

## **3. Schema do Supabase**

Execute no SQL editor do Supabase:

```sql
create table academy_videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  course_id uuid not null,
  bunny_video_id text not null,
  bunny_library_id integer,
  video_url text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Índices pra performance
create index idx_course_id on academy_videos(course_id);
create index idx_bunny_video_id on academy_videos(bunny_video_id);
```

---

## **4. Como usar**

### **Sintaxe:**
```bash
npx ts-node bunny-upload-script.ts <caminho-video> "<título>" "<descrição>" <course-id>
```

### **Exemplo prático:**
```bash
npx ts-node bunny-upload-script.ts "./videos/aula-1.mp4" "Aula 1 - Introdução" "O que você vai aprender nessa aula" "550e8400-e29b-41d4-a716-446655440000"
```

---

## **5. Workflow real**

Seu processo fica assim:

1. ✂️ Edita vídeo no editor (Premiere, DaVinci, etc)
2. 💾 Exporta: `/videos/aula-nova.mp4`
3. 🚀 Terminal:
   ```bash
   npx ts-node bunny-upload-script.ts "./videos/aula-nova.mp4" "Aula 2 - Técnicas" "Vamos aprender as técnicas..." "seu-course-uuid"
   ```
4. ✅ Script faz upload + salva no BD
5. 🔗 Vídeo já tá no seu academy

---

## **6. Automação extra (opcional)**

Se quiser, pode criar um script `.sh` pra facilitar:

```bash
#!/bin/bash
# upload-video.sh

VIDEO_PATH=$1
TITLE=$2
DESCRIPTION=$3
COURSE_ID=$4

npx ts-node bunny-upload-script.ts "$VIDEO_PATH" "$TITLE" "$DESCRIPTION" "$COURSE_ID"
```

Então usa assim:
```bash
chmod +x upload-video.sh
./upload-video.sh "./videos/aula.mp4" "Título" "Descrição" "uuid"
```

---

## **7. Comprovar no React**

No seu componente:

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function VideoPlayer({ courseId }: { courseId: string }) {
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from('academy_videos')
        .select('*')
        .eq('course_id', courseId);
      
      setVideos(data || []);
    };

    fetchVideos();
  }, [courseId]);

  return (
    <div>
      {videos.map((video) => (
        <div key={video.id} className="mb-4">
          <h3>{video.title}</h3>
          <iframe
            src={video.video_url}
            frameBorder="0"
            allowFullScreen
            allow="autoplay"
            className="w-full aspect-video rounded-lg"
          />
          <p className="text-sm text-gray-600 mt-2">{video.description}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## **Custo**

- Bunny: ~$0.01/GB de armazenamento (praticamente nada)
- Seu tempo: 5 min por upload

**Bunny vs Panda Video por ano:** economiza ~R$1.200
