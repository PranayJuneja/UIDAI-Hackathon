'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { WS_CHAT_URL } from '../lib/config';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    isStreaming?: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseTerminalChatOptions {
    enabled?: boolean;
    locationContext?: {
        name: string;
        type: 'state' | 'district';
        signals?: { growth: number; flow: number; labor: number };
    };
}

interface UseTerminalChatReturn {
    messages: ChatMessage[];
    isStreaming: boolean;
    connectionStatus: ConnectionStatus;
    sendMessage: (text: string) => void;
    clearMessages: () => void;
}

export function useTerminalChat(options: UseTerminalChatOptions = {}): UseTerminalChatReturn {
    const { enabled = true, locationContext } = options;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

    const wsRef = useRef<WebSocket | null>(null);
    const streamingMessageIdRef = useRef<string | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 3;

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

        setConnectionStatus('connecting');

        try {
            const ws = new WebSocket(WS_CHAT_URL);

            ws.onopen = () => {
                setConnectionStatus('connected');
                reconnectAttempts.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case 'system':
                            // Ignore system messages in terminal chat
                            break;

                        case 'stream_start':
                            streamingMessageIdRef.current = `stream-${Date.now()}`;
                            setMessages(prev => [...prev, {
                                id: streamingMessageIdRef.current!,
                                role: 'assistant',
                                text: '',
                                isStreaming: true
                            }]);
                            setIsStreaming(true);
                            break;

                        case 'stream':
                            if (streamingMessageIdRef.current && data.content) {
                                setMessages(prev => prev.map(msg =>
                                    msg.id === streamingMessageIdRef.current
                                        ? { ...msg, text: msg.text + data.content }
                                        : msg
                                ));
                            }
                            break;

                        case 'stream_end':
                            if (streamingMessageIdRef.current) {
                                setMessages(prev => prev.map(msg =>
                                    msg.id === streamingMessageIdRef.current
                                        ? { ...msg, text: data.content || msg.text, isStreaming: false }
                                        : msg
                                ));
                                streamingMessageIdRef.current = null;
                            }
                            setIsStreaming(false);
                            break;

                        case 'response':
                            if (data.content) {
                                setMessages(prev => [...prev, {
                                    id: `resp-${Date.now()}`,
                                    role: 'assistant',
                                    text: data.content
                                }]);
                            }
                            setIsStreaming(false);
                            break;
                    }
                } catch (e) {
                    console.error('Terminal chat: Failed to parse message', e);
                }
            };

            ws.onerror = () => {
                setConnectionStatus('error');
            };

            ws.onclose = () => {
                wsRef.current = null;
                setConnectionStatus('disconnected');
                setIsStreaming(false);

                // Auto-reconnect if enabled
                if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    setTimeout(connect, 1000 * reconnectAttempts.current);
                }
            };

            wsRef.current = ws;
        } catch (e) {
            console.error('Terminal chat: Failed to create WebSocket', e);
            setConnectionStatus('error');
        }
    }, [enabled]);

    // Disconnect cleanup
    useEffect(() => {
        if (enabled) {
            connect();
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [enabled, connect]);

    // Send message with location context
    const sendMessage = useCallback((text: string) => {
        if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            return;
        }

        // Add user message to local state
        setMessages(prev => [...prev, {
            id: `user-${Date.now()}`,
            role: 'user',
            text: text.trim()
        }]);

        // Build context-enhanced message
        let contextualMessage = text;
        if (locationContext) {
            const signalInfo = locationContext.signals
                ? ` Signals: Growth=${locationContext.signals.growth.toFixed(2)}, Flow=${locationContext.signals.flow.toFixed(2)}, Labor=${locationContext.signals.labor.toFixed(2)}.`
                : '';
            contextualMessage = `[Context: User is viewing ${locationContext.name} (${locationContext.type}).${signalInfo}] ${text}`;
        }

        try {
            wsRef.current.send(JSON.stringify({
                type: 'message',
                content: contextualMessage
            }));
            setIsStreaming(true);
        } catch (e) {
            console.error('Terminal chat: Failed to send message', e);
        }
    }, [locationContext]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        messages,
        isStreaming,
        connectionStatus,
        sendMessage,
        clearMessages
    };
}
