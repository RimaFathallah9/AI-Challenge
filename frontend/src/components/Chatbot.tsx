import React, { useState, useRef, useEffect } from 'react';
import { aiApi } from '../services/api';
import { Bot, Send, X, MessageSquare, Loader2, Sparkles } from 'lucide-react';

interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: '1',
        sender: 'ai',
        text: 'Hello! I am your NEXOVA AI Assistant. I can help answer questions about the factory, explain my autonomous decisions, or generate energy reports. How can I help you today?',
        timestamp: new Date()
    }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userMsg, timestamp: new Date() }]);
        setIsLoading(true);

        try {
            const { data } = await aiApi.chat(userMsg);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: data.reply || "I couldn't process that request.",
                timestamp: new Date()
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: '⚠️ Sorry, I am having trouble connecting to the backend right now.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-96 h-[500px] max-h-[80vh] flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in origin-bottom-right">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-surface to-background px-4 py-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text-primary text-sm">NEXOVA AI</h3>
                                <p className="text-xs text-green-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-muted hover:text-text-primary p-1 rounded-md transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-surface border border-border text-text-primary rounded-bl-none shadow-sm'
                                    }`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    <span className="text-[10px] opacity-60 mt-1 block">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-surface border border-border rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin text-blue-400" />
                                    <span className="text-xs text-muted">AI is thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-border bg-surface">
                        <form onSubmit={handleSend} className="flex gap-2 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about machines, anomalies..."
                                className="flex-1 bg-background border border-border rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="absolute right-1 top-1 p-1.5 text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center ${isOpen ? 'bg-surface border border-border text-muted hover:text-text-primary' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>
        </div>
    );
}
