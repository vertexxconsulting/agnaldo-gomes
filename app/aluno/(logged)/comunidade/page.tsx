'use client';

import { useState } from 'react';
import { MessageSquare, Heart, Share2, MoreHorizontal, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/Button';

// Dados mockados para o feed da comunidade
const POSTS = [
  {
    id: 1,
    author: { name: 'Mariana Silva', avatar: 'https://i.pravatar.cc/150?u=mariana', role: 'Aluna' },
    content: 'Pessoal, acabei de aplicar a técnica de colorimetria do módulo 2 e o resultado ficou incrível! O fundo de clareamento foi neutralizado perfeitamente. Alguém mais teve dificuldade com o tempo de pausa?',
    likes: 24,
    comments: 5,
    time: '2 horas atrás'
  },
  {
    id: 2,
    author: { name: 'Agnaldo Gomes', avatar: 'https://i.pravatar.cc/150?u=agnaldo', role: 'Professor' },
    content: 'Dica do dia: O segredo para um corte Pixie perfeito não está apenas na tesoura, mas no estudo do formato do rosto (Visagismo). Não pulem o Módulo 1 do curso de Cortes!',
    likes: 156,
    comments: 32,
    time: '5 horas atrás',
    isProfessor: true
  }
];

export default function ComunidadePage() {
  const [newPost, setNewPost] = useState('');

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
      <div className="max-w-3xl mx-auto w-full">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Comunidade</h1>
          <p className="text-white/60">Troque experiências, tire dúvidas e compartilhe seus resultados.</p>
        </div>

        {/* Criar Post */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex-shrink-0 overflow-hidden">
               <img src="https://i.pravatar.cc/150?u=current_user" alt="Você" />
            </div>
            <div className="flex-1">
              <textarea 
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                placeholder="Compartilhe algo com a comunidade..."
                className="w-full bg-transparent text-white resize-none outline-none min-h-[80px] placeholder:text-white/40"
              />
              <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-2">
                <button className="text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm">
                  <ImageIcon size={18} />
                  <span>Foto/Vídeo</span>
                </button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  disabled={!newPost.trim()}
                  onClick={() => { alert('Post enviado!'); setNewPost(''); }}
                >
                  Publicar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-6">
          {POSTS.map(post => (
            <div key={post.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden">
                    <img src={post.author.avatar} alt={post.author.name} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{post.author.name}</span>
                      {post.isProfessor && (
                        <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Professor</span>
                      )}
                    </div>
                    <div className="text-xs text-white/40">{post.time}</div>
                  </div>
                </div>
                <button className="text-white/30 hover:text-white">
                  <MoreHorizontal size={20} />
                </button>
              </div>
              
              <p className="text-white/80 text-sm leading-relaxed mb-4">
                {post.content}
              </p>

              <div className="flex items-center gap-6 border-t border-white/10 pt-4">
                <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium">
                  <Heart size={18} /> {post.likes}
                </button>
                <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium">
                  <MessageSquare size={18} /> {post.comments}
                </button>
                <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium">
                  <Share2 size={18} /> Compartilhar
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
