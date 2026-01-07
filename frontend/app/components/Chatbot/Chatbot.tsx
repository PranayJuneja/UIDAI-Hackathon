'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import ChatBubble from './ChatBubble';
import { useMapStore } from '../../stores/mapStore';
import styles from './Chatbot.module.css';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
}

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: 'welcome', text: "Hello. I am functioning within normal parameters. Requesting query regarding Aadhaar data or map demographics.", isUser: false }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Map Store Actions
    const drillIntoState = useMapStore(state => state.drillIntoState);
    const drillBackToIndia = useMapStore(state => state.drillBackToIndia);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    // WebSocket Connection
    useEffect(() => {
        if (!isOpen) return;

        // Connect to local API
        const ws = new WebSocket('ws://localhost:8000/ws/chat');

        ws.onopen = () => {
            console.log('Connected to Chronos Chat');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Handle new protocol: { type: "response", content: "...", action: ... }
                if (data.type === 'response') {
                    if (data.content) {
                        setMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            text: data.content,
                            isUser: false
                        }]);
                    }
                    if (data.action) {
                        handleClientAction(data.action);
                    }
                }
                // Handle legacy or plain format just in case
                else if (data.text) {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        text: data.text,
                        isUser: false
                    }]);
                    if (data.client_action) {
                        handleClientAction(data.client_action);
                    }
                }

                setIsThinking(false);
            } catch (e) {
                console.error('Failed to parse message', e);
                setIsThinking(false);
            }
        };

        ws.onerror = (e) => {
            console.error('WebSocket error', e);
            setIsThinking(false);
        };

        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, [isOpen]);

    const handleClientAction = (action: { type: string, payload: any }) => {
        console.log("Executing Action:", action);

        switch (action.type) {
            case 'FLY_TO':
            case 'ZOOM':
            case 'highlight': // Handle synonym
                const target = action.payload || "India";
                const states = useMapStore.getState().states;
                // Simple fuzzy match for Hackathon
                const state = states.find(s => s.name.toLowerCase().includes(target.toString().toLowerCase()));

                if (state) {
                    drillIntoState(state.state_id, state.name);
                } else if (target.toString().toLowerCase().includes('india')) {
                    drillBackToIndia();
                }
                break;

            case 'RESET':
                drillBackToIndia();
                break;
        }
    };

    const sendMessage = () => {
        if (!inputValue.trim() || !wsRef.current) return;

        // Add User Message
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: inputValue,
            isUser: true
        }]);

        // Send to Backend (JSON format preferred)
        try {
            wsRef.current.send(JSON.stringify({
                type: 'message',
                content: inputValue
            }));
        } catch {
            wsRef.current.send(inputValue); // Fallback
        }

        setInputValue('');
        setIsThinking(true);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={styles.toggleBtn}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className={styles.chatContainer}
                    >
                        {/* Header */}
                        <div className={styles.header}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <h3
                                        className="font-semibold text-[0.95rem] tracking-wide"
                                        style={{
                                            background: 'linear-gradient(to right, #e2e8f0, #94a3b8)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                                        }}
                                    >
                                        Chronos Copilot
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                                        Aadhaar Analytics Active
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={styles.closeBtn}
                            >
                                <X size={20} strokeWidth={2} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className={styles.messagesArea}>
                            {messages.map((msg) => (
                                <ChatBubble key={msg.id} message={msg.text} isUser={msg.isUser} />
                            ))}

                            {isThinking && (
                                <div className="flex justify-start">
                                    <div
                                        className="px-3 py-2 rounded-[10px] backdrop-blur-md flex items-center gap-2 border border-white/5"
                                    >
                                        <div className="flex space-x-1">
                                            <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className={styles.inputArea}>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Ask about saturation or migration..."
                                    className={styles.input}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!inputValue.trim() || isThinking}
                                    className={`${styles.sendBtn} ${inputValue.trim() ? styles.active : ''}`}
                                >
                                    <Send size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                            <div className="mt-2 text-[8px] text-center text-slate-700 font-mono tracking-widest opacity-50">
                                CHRONOS-X INTELLIGENCE ENGINE
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Chatbot;
