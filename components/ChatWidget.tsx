import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Lead } from '../types';
import { chatWithData } from '../services/geminiService';

interface ChatWidgetProps {
  leads: Lead[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ leads }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); 
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Olá! Sou sua IA de vendas. Analiso seus dados em tempo real.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages, isOpen, isExpanded]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    const answer = await chatWithData(input, leads);
    const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: answer };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 p-4 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 z-50 group"
        >
          <Sparkles size={24} className="group-hover:animate-spin-slow" />
        </button>
      )}

      {isOpen && (
        <div className={`fixed bottom-8 right-8 glass-heavy rounded-[32px] flex flex-col z-50 border border-white/50 dark:border-white/10 animate-enter transition-all duration-500 ease-spring ${isExpanded ? 'w-[90vw] md:w-[600px] h-[80vh]' : 'w-[380px] h-[600px]'}`}>
          
          {/* Header */}
          <div className="p-4 border-b border-gray-200/50 dark:border-white/10 flex justify-between items-center bg-white/50 dark:bg-white/5 rounded-t-[32px]">
            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-hf-lemon to-hf-green flex items-center justify-center text-white"><Bot size={18}/></div>
              <div><p className="font-bold text-sm text-gray-900 dark:text-white">Sales AI</p><p className="text-[10px] text-green-500 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Online</p></div>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition"><Maximize2 size={16} /></button>
                <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"><X size={18} /></button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-transparent">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 text-sm shadow-sm ${msg.role === 'user' ? 'bg-hf-lemon text-white rounded-2xl rounded-tr-sm' : 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-white/5'}`}>
                  {msg.role === 'user' ? msg.content : (
                    <div className="prose prose-sm max-w-none prose-p:leading-snug prose-strong:text-hf-green dark:prose-strong:text-hf-lemon prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-white/10 border border-gray-100 dark:border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/80 dark:bg-[#1C1C1E]/80 border-t border-gray-100 dark:border-white/10 rounded-b-[32px]">
            <div className="flex gap-2 bg-gray-100 dark:bg-white/10 rounded-full p-1.5 pl-4 focus-within:bg-white dark:focus-within:bg-[#2C2C2E] focus-within:ring-2 focus-within:ring-hf-lemon/50 transition-all shadow-inner">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte algo..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
              />
              <button onClick={handleSend} disabled={isLoading} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-105 transition active:scale-95 disabled:opacity-50">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};