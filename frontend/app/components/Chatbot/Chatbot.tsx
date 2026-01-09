'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, WifiOff, Loader2 } from 'lucide-react';
import ChatBubble from './ChatBubble';
import { useMapStore } from '../../stores/mapStore';
import { WS_CHAT_URL } from '../../lib/config';
import styles from './Chatbot.module.css';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    isSystem?: boolean;
    isError?: boolean;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const messageQueueRef = useRef<string[]>([]);

    // Map Store Actions
    const drillIntoState = useMapStore(state => state.drillIntoState);
    const drillBackToIndia = useMapStore(state => state.drillBackToIndia);

    // Scroll to bottom when messages change
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking, scrollToBottom]);

    // Handle actions from the AI
    const handleClientAction = useCallback((action: { type: string; payload?: string | null }) => {
        if (!action || !action.type) return;

        // Debug logging only in development
        if (process.env.NODE_ENV === 'development') {
            console.log("Executing Action:", action);
        }

        switch (action.type) {
            case 'FLY_TO':
            case 'ZOOM':
            case 'highlight': {
                const target = action.payload || "India";
                const states = useMapStore.getState().states;
                const state = states.find(s =>
                    s.name.toLowerCase().includes(target.toString().toLowerCase())
                );

                if (state) {
                    drillIntoState(state.state_id, state.name);
                } else if (target.toString().toLowerCase().includes('india')) {
                    drillBackToIndia();
                }
                break;
            }

            case 'COMPARE': {
                if (action.payload && typeof action.payload === 'string') {
                    const parts = action.payload.split(/\s+vs\s+/i);
                    if (parts.length >= 2) {
                        // Future: trigger comparison mode in dashboard
                    }
                }
                break;
            }

            case 'RESET':
                drillBackToIndia();
                break;
        }
    }, [drillIntoState, drillBackToIndia]);

    // WebSocket connection logic
    const connect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }

        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            setConnectionStatus('error');
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                text: "Unable to connect to the AI server after multiple attempts. Please refresh the page to try again.",
                isUser: false,
                isError: true
            }]);
            return;
        }

        setConnectionStatus('connecting');

        try {
            const ws = new WebSocket(WS_CHAT_URL);

            ws.onopen = () => {
                setConnectionStatus('connected');
                reconnectAttempts.current = 0;

                // Process any queued messages
                if (messageQueueRef.current.length > 0) {
                    const queuedMessages = [...messageQueueRef.current];
                    messageQueueRef.current = [];
                    queuedMessages.forEach(msg => {
                        try {
                            ws.send(JSON.stringify({
                                type: 'message',
                                content: msg
                            }));
                        } catch (e) {
                            console.error('Failed to send queued message', e);
                        }
                    });
                    if (queuedMessages.length > 0) {
                        setIsThinking(true);
                    }
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case 'system':
                            setMessages(prev => [...prev, {
                                id: `sys-${Date.now()}`,
                                text: data.content,
                                isUser: false,
                                isSystem: true
                            }]);
                            break;

                        case 'typing':
                            setIsThinking(true);
                            break;

                        case 'response':
                            setIsThinking(false);
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
                            break;

                        default:
                            if (data.text) {
                                setIsThinking(false);
                                setMessages(prev => [...prev, {
                                    id: Date.now().toString(),
                                    text: data.text,
                                    isUser: false
                                }]);
                                if (data.client_action) {
                                    handleClientAction(data.client_action);
                                }
                            }
                    }
                } catch (e) {
                    console.error('Failed to parse message', e);
                    setIsThinking(false);
                }
            };

            ws.onerror = (e) => {
                console.error('WebSocket error', e);
                setIsThinking(false);
            };

            ws.onclose = () => {
                wsRef.current = null;
                setConnectionStatus('disconnected');
                setIsThinking(false);

                if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(
                        RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current),
                        16000
                    );
                    reconnectAttempts.current++;
                    reconnectTimeout.current = setTimeout(connect, delay);
                }
            };

            wsRef.current = ws;
        } catch (e) {
            console.error('Failed to create WebSocket', e);
            setConnectionStatus('error');
        }
    }, [handleClientAction]);

    useEffect(() => {
        if (isOpen) {
            reconnectAttempts.current = 0;
            connect();
        } else {
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setConnectionStatus('disconnected');
        }

        return () => {
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [isOpen, connect]);

    const sendMessage = useCallback(() => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput) return;

        // Queue message if not connected
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            messageQueueRef.current.push(trimmedInput);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: trimmedInput,
                isUser: true
            }, {
                id: `queued-${Date.now()}`,
                text: "Message queued. Will be sent when connection is restored.",
                isUser: false,
                isSystem: true
            }]);
            setInputValue('');
            return;
        }

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: trimmedInput,
            isUser: true
        }]);

        try {
            wsRef.current.send(JSON.stringify({
                type: 'message',
                content: trimmedInput
            }));
            setIsThinking(true);
        } catch (e) {
            console.error('Failed to send message', e);
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                text: "Failed to send message. Please try again.",
                isUser: false,
                isError: true
            }]);
        }

        setInputValue('');
    }, [inputValue]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const ConnectionIndicator = () => {
        switch (connectionStatus) {
            case 'connecting':
                return (
                    <span className="flex items-center gap-1.5 text-[10px] text-yellow-400 font-mono uppercase tracking-wider">
                        <Loader2 size={10} className="animate-spin" />
                        Connecting...
                    </span>
                );
            case 'connected':
                return (
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                        Aadhaar Analytics Active
                    </span>
                );
            case 'disconnected':
                return (
                    <span className="flex items-center gap-1.5 text-[10px] text-yellow-400 font-mono uppercase tracking-wider">
                        <Loader2 size={10} className="animate-spin" />
                        Reconnecting...
                    </span>
                );
            case 'error':
                return (
                    <span className="flex items-center gap-1.5 text-[10px] text-red-400 font-mono uppercase tracking-wider">
                        <WifiOff size={10} />
                        Connection Failed
                    </span>
                );
        }
    };

    return (
        <>
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

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className={styles.chatContainer}
                    >
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
                                    <ConnectionIndicator />
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={styles.closeBtn}
                            >
                                <X size={20} strokeWidth={2} />
                            </button>
                        </div>

                        <div className={styles.messagesArea}>
                            {messages.map((msg) => (
                                <ChatBubble
                                    key={msg.id}
                                    message={msg.text}
                                    isUser={msg.isUser}
                                    isSystem={msg.isSystem}
                                    isError={msg.isError}
                                />
                            ))}

                            {isThinking && (
                                <div className="flex justify-start">
                                    <div className="px-3 py-2 rounded-[10px] backdrop-blur-md flex items-center gap-2 border border-white/5">
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

                        <div className={styles.inputArea}>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder={
                                        connectionStatus === 'connected'
                                            ? "Ask about saturation or migration..."
                                            : "Waiting for connection..."
                                    }
                                    disabled={connectionStatus !== 'connected'}
                                    className={styles.input}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!inputValue.trim() || isThinking || connectionStatus !== 'connected'}
                                    className={`${styles.sendBtn} ${inputValue.trim() && connectionStatus === 'connected' ? styles.active : ''}`}
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
