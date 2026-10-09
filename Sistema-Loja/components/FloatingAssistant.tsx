'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, MinusCircle } from 'lucide-react';
import { obterIAConfig, DEFAULT_IA_CONFIG } from '@/lib/ia-config';

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [chat, setChat] = useState<Array<{ remetente: 'user' | 'ia'; texto: string }>>([]);
  const [pensando, setPensando] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, pensando]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    if (chat.length === 0) {
      setChat([
        {
          remetente: 'ia',
          texto: 'Olá! Sou a IA Assistente do Studio Agnaldo Gomes. Como posso te ajudar hoje na gestão, na recepção ou em dúvidas operacionais?'
        }
      ]);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mensagem.trim() || pensando) return;

    const texto = mensagem;
    setMensagem('');
    setChat(prev => [...prev, { remetente: 'user', texto }]);
    setPensando(true);

    try {
      const config = typeof window !== 'undefined' ? obterIAConfig() : DEFAULT_IA_CONFIG;
      if (!config.ativa) {
        setChat(prev => [...prev, { remetente: 'ia', texto: 'A IA Assistente está desativada no momento. Solicite ao administrador para ativá-la na aba de configuração.' }]);
        setPensando(false);
        return;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: texto, config })
      });
      
      const data = await res.json();
      
      if (res.status === 503 && data.missingApiKey) {
        setChat(prev => [...prev, { remetente: 'ia', texto: 'Desculpe, a chave da IA (OpenAI) ainda não está configurada no servidor pela equipe técnica.' }]);
      } else if (!res.ok) {
        throw new Error(data.error || 'Erro na resposta');
      } else {
        setChat(prev => [...prev, { remetente: 'ia', texto: data.resposta }]);
      }
    } catch (error: any) {
      setChat(prev => [...prev, { remetente: 'ia', texto: `Erro: ${error.message}` }]);
    } finally {
      setPensando(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gold text-background rounded-full shadow-xl hover:scale-105 transition-all flex items-center justify-center animate-bounce group"
        title="Falar com a IA Assistente"
      >
        <Bot size={26} className="group-hover:animate-pulse" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[var(--color-card)] border border-gold/30 shadow-xl rounded-full pl-4 pr-2 py-2 cursor-pointer hover:bg-gold/10 transition-colors" onClick={() => setIsMinimized(false)}>
        <div className="relative">
          <Bot size={20} className="text-gold" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <span className="text-sm font-bold mr-2 text-foreground">IA Assistente</span>
        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-1 rounded-full hover:bg-foreground/10 text-foreground/50 hover:text-foreground">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 w-[360px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-100px)] bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-gold text-black p-4">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <div>
            <h3 className="font-bold text-sm leading-none mb-1">IA Assistente</h3>
            <p className="text-[10px] opacity-80 leading-none">Sempre online para ajudar</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-black/70">
          <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-black/10 rounded-lg transition-colors" title="Minimizar">
            <MinusCircle size={16} />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-black/10 rounded-lg transition-colors" title="Fechar">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background/40">
        <div className="text-center text-xs text-foreground/40 my-2">Hoje</div>
        {chat.map((msg, idx) => (
          <div key={idx} className={`flex flex-col max-w-[85%] ${msg.remetente === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
            <span className="text-[10px] text-foreground/40 mb-1 ml-1 font-medium">{msg.remetente === 'user' ? 'Você' : 'Assistente'}</span>
            <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${msg.remetente === 'user' ? 'bg-gold text-black rounded-tr-sm' : 'bg-[var(--color-card)] border border-[var(--border-subtle)] text-foreground rounded-tl-sm'}`}>
              {msg.texto}
            </div>
          </div>
        ))}
        {pensando && (
          <div className="flex flex-col max-w-[85%] mr-auto items-start">
            <span className="text-[10px] text-foreground/40 mb-1 ml-1 font-medium">Assistente</span>
            <div className="p-3 rounded-2xl text-sm bg-[var(--color-card)] border border-[var(--border-subtle)] text-foreground/50 rounded-tl-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[var(--color-card)] border-t border-[var(--border-subtle)]">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Pergunte algo..."
            className="w-full bg-background border border-[var(--border-subtle)] rounded-xl pl-4 pr-11 py-3 text-sm focus:outline-none focus:border-gold transition-colors"
            disabled={pensando}
          />
          <button
            type="submit"
            disabled={!mensagem.trim() || pensando}
            className="absolute right-2 p-2 text-gold hover:bg-gold/10 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
