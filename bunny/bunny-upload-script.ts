import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || "";
const BUNNY_API_KEY = process.env.BUNNY_API_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// TIPOS
// ============================================

interface VideoMetadata {
  title: string;
  description: string;
  courseId: string; // ID do curso no Supabase
  duration?: number;
}

interface BunnyResponse {
  guid: string;
  title: string;
  videoLibraryId: number;
  dateCreated: string;
}

// ============================================
// FUNÇÕES
// ============================================

/**
 * Faz upload do vídeo para Bunny
 */
async function uploadToBunny(
  videoPath: string,
  metadata: VideoMetadata
): Promise<BunnyResponse> {
  try {
    const fileBuffer = fs.readFileSync(videoPath);
    const fileSize = fileBuffer.length;

    console.log(`📤 Fazendo upload: ${metadata.title}`);
    console.log(`   Tamanho: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Passo 1: Criar o vídeo e obter o GUID (videoId)
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'AccessKey': BUNNY_API_KEY,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ title: metadata.title }),
      }
    );

    if (!createResponse.ok) {
      throw new Error(`Erro ao criar vídeo (HTTP ${createResponse.status}): ${createResponse.statusText}`);
    }

    const bunnyVideo: BunnyResponse = await createResponse.json();
    console.log(`⏳ Vídeo criado (ID: ${bunnyVideo.guid}). Iniciando envio de dados...`);

    // Passo 2: Fazer o upload do arquivo binário (PUT)
    const uploadResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideo.guid}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'AccessKey': BUNNY_API_KEY,
          'Content-Length': fileSize.toString(),
        },
        body: fileBuffer,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Erro ao fazer upload do arquivo (HTTP ${uploadResponse.status}): ${uploadResponse.statusText}`);
    }
    console.log(`✅ Upload concluído! ID: ${bunnyVideo.guid}`);

    return bunnyVideo;
  } catch (error) {
    console.error("❌ Erro no upload Bunny:", error);
    throw error;
  }
}

/**
 * Salva metadados no Supabase
 */
async function saveToDB(
  bunnyData: BunnyResponse,
  metadata: VideoMetadata
) {
  try {
    const { data, error } = await supabase
      .from("academy_videos")
      .insert({
        title: metadata.title,
        description: metadata.description,
        course_id: metadata.courseId,
        bunny_video_id: bunnyData.guid,
        bunny_library_id: bunnyData.videoLibraryId,
        video_url: `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${bunnyData.guid}`,
        created_at: new Date(),
      });

    if (error) {
      console.error("❌ Erro ao salvar no Supabase:", error);
      throw error;
    }

    console.log("✅ Metadados salvos no banco!");
    return data;
  } catch (error) {
    console.error("❌ Erro na integração Supabase:", error);
    throw error;
  }
}

/**
 * Função principal
 */
async function uploadVideo(
  videoPath: string,
  metadata: VideoMetadata
) {
  // Validações
  if (!fs.existsSync(videoPath)) {
    throw new Error(`❌ Arquivo não encontrado: ${videoPath}`);
  }

  if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
    throw new Error("❌ Configure BUNNY_API_KEY e BUNNY_LIBRARY_ID");
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("❌ Configure SUPABASE_URL e SUPABASE_KEY");
  }

  console.log("\n🚀 Iniciando upload do vídeo...\n");

  try {
    // 1. Upload para Bunny
    const bunnyData = await uploadToBunny(videoPath, metadata);

    // 2. Salvar no Supabase
    await saveToDB(bunnyData, metadata);

    console.log("\n✨ Tudo pronto! Vídeo disponível em:");
    console.log(
      `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${bunnyData.guid}`
    );

    return bunnyData;
  } catch (error) {
    console.error("\n💥 Erro durante o processo:", error);
    process.exit(1);
  }
}

// ============================================
// CLI USAGE
// ============================================

// Exemplo de uso:
// npx ts-node bunny-upload-script.ts "/caminho/do/video.mp4" "Aula 1 - Basics" "Sua primeira aula" "uuid-do-curso"

const args = process.argv.slice(2);

if (args.length < 4) {
  console.log("❌ Uso:");
  console.log(
    "   npx ts-node bunny-upload-script.ts <caminho-video> <título> <descrição> <course-id>"
  );
  console.log("\nExemplo:");
  console.log(
    '   npx ts-node bunny-upload-script.ts "./videos/aula-1.mp4" "Aula 1 - Basics" "Sua primeira aula" "550e8400-e29b-41d4-a716-446655440000"'
  );
  process.exit(1);
}

const [videoPath, title, description, courseId] = args;

uploadVideo(videoPath, {
  title,
  description,
  courseId,
}).catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
