import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: courses } = await supabase.from('courses').select('id, title').order('created_at', {ascending: false}).limit(1);
  if (courses && courses.length > 0) {
    const id = courses[0].id;
    console.log('Tentando excluir:', courses[0].title, id);
    const { error } = await supabase.from('courses').delete().eq('id', id);
    console.log('Erro de exclusão:', error);
  }
}
run();
