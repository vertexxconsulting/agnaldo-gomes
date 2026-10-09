'use client';

import { useState } from 'react';
import { HelpCircle, X, Send, Bot } from 'lucide-react';
import { obterIAConfig } from '@/lib/ia-config';

export function FloatingHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<Array<{ sender: 'user' | 'ia', text: string }>>([
    { sender: 'ia', text: 'Olá! Sou a Assistente do Studio. Tem alguma dúvida sobre o sistema, agendamentos ou regras?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = message;
    setChat(prev => [...prev, { sender: 'user', text: userMsg }]);
    setMessage('');
    setIsTyping(true);

    // Lógica Mockada igual do Simulador
    setTimeout(() => {
      let resposta = '';
      const pLower = userMsg.toLowerCase();
      const config = obterIAConfig();

      if (!config.ativa) {
        resposta = '⚠️ A IA Assistente está desativada no painel.';
      } else if (pLower.includes('agendamento') || pLower.includes('marcar') || pLower.includes('manual')) {
        resposta = '📅 *Agendamentos:* Para manuais, acesse a aba "Agenda". Encaixes pós-horário só com aprovação do gerente.';
      } else if (pLower.includes('relat') || pLower.includes('fatur')) {
        resposta = '📊 O relatório diário consolida os faturamentos e atendimentos. Ele é gerado e enviado na aba "IA Assistente".';
      } else if (pLower.includes('noiva') || pLower.includes('casamento')) {
        resposta = `💍 *Noivas:* Sinal obrigatório de 50% via PIX para bloqueio da data.`;
      } else if (pLower.includes('curso') || pLower.includes('academy')) {
        resposta = `🎓 *Academy:* Alunos têm suporte na plataforma Vimeo e grupo VIP.`;
      } else {
        resposta = `🤖 Entendi sua dúvida. Como sou um simulador no momento, consulte a aba "Ajuda / Tutorial" no menu ou pergunte sobre "agendamentos", "relatórios" e "noivas".`;
      }

      setChat(prev => [...prev, { sender: 'ia', text: resposta }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gold rounded-full shadow-lg shadow-gold/20 flex items-center justify-center text-black hover:scale-105 transition-transform z-40 ${isOpen ? 'scale-0' : 'scale-100'}`}
        title="Ajuda e Suporte"
      >
        <HelpCircle size={28} />
      </button>

      {/* Janela de Chat */}
      <div 
        className={`fixed bottom-6 right-6 w-[340px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-48px)] bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="bg-gold px-4 py-3 flex items-center justify-between text-black">
          <div className="flex items-center gap-2 font-bold">
            <Bot size={20} />
            Assistente IA
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:bg-black/10 p-1.5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Chat Box */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--background)]">
          {chat.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.sender === 'user' 
                  ? 'bg-foreground/10 text-foreground rounded-tr-sm' 
                  : 'bg-[var(--color-card)] border border-[var(--border-subtle)] text-foreground/80 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 bg-[var(--color-card)] border-t border-[var(--border-subtle)] flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua dúvida..."
            className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <button 
            type="submit" 
            disabled={!message.trim() || isTyping}
            className="w-10 h-10 rounded-xl bg-gold text-black flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </>
  );
}
