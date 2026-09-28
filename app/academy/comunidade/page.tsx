'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  category: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    role: string;
  };
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [category, setCategory] = useState('Geral');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [category]);

  async function fetchPosts() {
    setLoading(true);
    
    let query = supabase
      .from('community_posts')
      .select(`
        *,
        profiles (
          full_name,
          avatar_url,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (category !== 'Geral') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  }

  async function handlePost() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newPost.trim()) return;

    setPosting(true);
    const { error } = await supabase
      .from('community_posts')
      .insert({
        user_id: user.id,
        content: newPost,
        category: category,
        created_at: new Date().toISOString(),
      });

    if (error) {
      alert('Erro ao postar: ' + error.message);
    } else {
      setNewPost('');
      await fetchPosts();
    }
    setPosting(false);
  }

  return (
    <div className="pb-20 px-4 sm:px-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
        
        {/* Left Sidebar - Filters */}
        <div className="hidden lg:block space-y-6">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-gold/10">
            <h3 className="font-bold text-lg mb-4 text-foreground">Categorias</h3>
            <div className="space-y-2">
              {['Geral', 'Marketing Digital', 'Vendas High Ticket', 'Tráfego Pago', 'Avisos'].map((cat) => (
                <button 
                  key={cat} 
                  onClick={() => setCategory(cat)}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${
                    category === cat 
                      ? 'text-[#B8860B] bg-[#B8860B]/10 font-bold' 
                      : 'text-foreground/60 hover:text-foreground hover:bg-white/[0.05]'
                  }`}
                >
                  #{cat}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-gold/10">
            <h3 className="font-bold text-lg mb-4 text-foreground">Comunidade</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Espaço para trocar experiências, tirar dúvidas e crescer junto com outros alunos.
            </p>
          </div>
        </div>

        {/* Main Feed */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Create Post Input */}
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-gold/10 shadow-xl">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#B8860B] flex items-center justify-center text-black font-bold shrink-0">
                U
              </div>
              <div className="flex-1">
                <textarea 
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder={`O que você está aprendendo em #${category}?`}
                  className="w-full bg-transparent border-none focus:ring-0 text-foreground placeholder-gray-500 resize-none py-2"
                  rows={3}
                />
                <div className="flex items-center justify-between pt-3 border-t border-gold/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Postando em:</span>
                    <span className="text-xs font-bold text-[#B8860B]">#{category}</span>
                  </div>
                  <button 
                    onClick={handlePost}
                    disabled={!newPost.trim() || posting}
                    className="bg-[#B8860B] text-black px-6 py-2 rounded-full font-bold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {posting ? 'Postando...' : 'Postar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feed Posts */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {posts.length > 0 ? posts.map((post) => (
                <div key={post.id} className="p-6 rounded-3xl bg-white/[0.03] border border-gold/10 hover:border-[#B8860B]/30 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3">
                      <img 
                        src={post.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`} 
                        className="w-10 h-10 rounded-full" 
                        alt={post.profiles?.full_name} 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{post.profiles?.full_name || 'Usuário'}</span>
                          {post.profiles?.role === 'ADMIN' && (
                            <span className="bg-[#B8860B] text-black text-[10px] font-black px-1.5 py-0.5 rounded uppercase">Admin</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(post.created_at).toLocaleDateString('pt-BR')} • #{post.category}
                        </span>
                      </div>
                    </div>
                    <button className="text-gray-500 hover:text-foreground text-xl">⋯</button>
                  </div>
                  
                  <p className="text-foreground/50 leading-relaxed mb-6">
                    {post.content}
                  </p>
                  
                  <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                    <button className="flex items-center gap-2 text-sm text-foreground/60 hover:text-[#B8860B] transition-colors">
                      <span className="text-lg">👍</span> Curtir
                    </button>
                    <button className="flex items-center gap-2 text-sm text-foreground/60 hover:text-[#B8860B] transition-colors">
                      <span className="text-lg">💬</span> Comentar
                    </button>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center text-gray-500 border border-dashed border-gold/10 rounded-3xl">
                  Nenhum post encontrado nesta categoria. Seja o primeiro a postar!
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
