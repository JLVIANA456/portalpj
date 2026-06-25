import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Paperclip, Smile, Send, Check, CheckCheck, User } from 'lucide-react';
import { PJUser } from '../../types';

interface WhatsappViewProps {
  user: PJUser;
}

export default function WhatsappView({ user }: WhatsappViewProps) {
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const chats = [
    { id: 1, name: 'João Silva', lastMessage: 'Bom dia, a nota já foi emitida?', time: '13:00', unread: 2, avatar: 'J' },
    { id: 2, name: 'Empresa XPTO', lastMessage: 'Ok, aguardo o envio do boleto.', time: 'Ontem', unread: 0, avatar: 'E' },
    { id: 3, name: 'Maria Souza', lastMessage: 'Obrigada!', time: 'Segunda', unread: 0, avatar: 'M' },
    { id: 4, name: 'Suporte Técnico', lastMessage: 'Seu chamado foi resolvido.', time: 'Sexta', unread: 0, avatar: 'S' },
  ];

  return (
    <div className="h-full w-full min-h-[600px] bg-slate-200 dark:bg-slate-900 flex overflow-hidden font-sans rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      
      {/* Left Sidebar (Lista de Chats) */}
      <div className="w-[35%] min-w-[360px] max-w-[450px] flex flex-col bg-white border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex-shrink-0">
        
        {/* Header Left */}
        <div className="h-16 px-4 py-2 flex items-center justify-between bg-[#f0f2f5] dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-emerald-600 dark:text-emerald-500">WhatsApp</h1>
          </div>
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Filter className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white dark:bg-slate-900">
          <div className="flex items-center bg-[#f0f2f5] dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Pesquisar conversas..." 
              className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm ml-3 text-slate-700 dark:text-slate-200 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800">
          <button className="px-3.5 py-1 bg-[#f0f2f5] dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-sm font-medium whitespace-nowrap hover:bg-slate-200">Tudo</button>
          <button className="px-3.5 py-1 bg-[#f0f2f5] dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-sm font-medium whitespace-nowrap hover:bg-slate-200">Não lidas</button>
          <button className="px-3.5 py-1 bg-[#f0f2f5] dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-sm font-medium whitespace-nowrap hover:bg-slate-200">Favoritas</button>
          <button className="px-3.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-sm font-medium whitespace-nowrap">Grupos</button>
        </div>

        {/* Security Notice */}
        <div className="px-4 py-3 bg-white dark:bg-slate-900 flex justify-center text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 max-w-[280px] text-center">
            <span className="text-emerald-600 dark:text-emerald-500">🔒 Suas mensagens pessoais são protegidas com a criptografia de ponta a ponta</span>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          {chats.map(chat => (
            <div 
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`flex items-center px-3 py-3 cursor-pointer hover:bg-[#f5f6f6] dark:hover:bg-slate-800 transition-colors ${activeChat === chat.id ? 'bg-[#f0f2f5] dark:bg-slate-800' : ''}`}
            >
              <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-xl text-slate-600 dark:text-slate-300 mr-3 flex-shrink-0">
                {chat.avatar}
              </div>
              <div className="flex-1 min-w-0 border-b border-slate-100 dark:border-slate-800 pb-3 pr-2">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h2 className={`text-[17px] truncate ${chat.unread > 0 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'}`}>{chat.name}</h2>
                  <span className={`text-xs ${chat.unread > 0 ? 'text-emerald-500 font-semibold' : 'text-slate-500'}`}>{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate flex-1">{chat.lastMessage}</p>
                  {chat.unread > 0 && (
                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[20px] text-center rounded-full ml-2">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content (Chat Área) */}
      {activeChat ? (
        <div className="flex-1 flex flex-col relative bg-[#efeae2] dark:bg-[#0b141a]">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-40 dark:opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://static.whatsapp.net/rsrc.php/v3/yl/r/170_N4xH9sM.png")', backgroundRepeat: 'repeat' }}></div>
          
          {/* Header Right */}
          <div className="h-16 px-4 flex items-center justify-between bg-[#f0f2f5] dark:bg-slate-800 z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-[16px] font-medium text-slate-800 dark:text-slate-200">
                {chats.find(c => c.id === activeChat)?.name}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
              <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Search className="w-5 h-5" /></button>
              <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-2 z-10">
            {/* Example Messages */}
            <div className="self-center bg-[#ffeecd] dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg mb-4 shadow-sm border border-[#ffdb9c] dark:border-slate-700">
              Hoje
            </div>
            
            <div className="self-start max-w-[85%] md:max-w-[65%] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-2 px-3 rounded-lg shadow-sm rounded-tl-none relative">
              <p className="text-[14.5px] leading-relaxed">Olá, bom dia!</p>
              <span className="text-[11px] text-slate-400 float-right ml-4 mt-2">10:45</span>
            </div>
            
            <div className="self-end max-w-[85%] md:max-w-[65%] bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-800 dark:text-slate-100 p-2 px-3 rounded-lg shadow-sm rounded-tr-none relative">
              <p className="text-[14.5px] leading-relaxed">Bom dia! Em que posso ajudar?</p>
              <div className="float-right flex items-center gap-1 ml-4 mt-1.5">
                <span className="text-[11px] text-green-700/60 dark:text-green-200/60">10:46</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
              </div>
            </div>
            
            <div className="self-start max-w-[85%] md:max-w-[65%] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-2 px-3 rounded-lg shadow-sm rounded-tl-none relative">
              <p className="text-[14.5px] leading-relaxed">{chats.find(c => c.id === activeChat)?.lastMessage}</p>
              <span className="text-[11px] text-slate-400 float-right ml-4 mt-2">{chats.find(c => c.id === activeChat)?.time === 'Hoje' ? '11:00' : '13:00'}</span>
            </div>
          </div>

          {/* Footer Input */}
          <div className="min-h-[62px] px-4 py-2.5 bg-[#f0f2f5] dark:bg-slate-800 flex items-end gap-3 z-10">
            <div className="flex gap-1 pb-1">
              <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"><Smile className="w-6 h-6" /></button>
              <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"><Paperclip className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-700 rounded-lg shadow-sm overflow-hidden flex items-center">
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Digite uma mensagem" 
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 py-3 px-4 resize-none max-h-32 min-h-[44px] text-[15px] dark:text-white"
                rows={1}
              />
            </div>
            <button 
              className={`p-2 pb-2 transition-colors ${message.trim() ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400'}`}
              disabled={!message.trim()}
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#111b21] border-b-[6px] border-emerald-500">
          <div className="text-center px-6">
            <h1 className="text-3xl font-light text-slate-600 dark:text-slate-300 mb-4 mt-6">WhatsApp para Portal PJ</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Envie e receba mensagens rapidamente sem conectar seu celular.
              <br />Use o WhatsApp integrado para comunicar com seus clientes.
            </p>
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-center items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <span className="text-slate-500">🔒</span> Protegido com criptografia de ponta a ponta
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
