'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatBubbleProps {
    message: string;
    isUser: boolean;
    isSystem?: boolean;
    isError?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser, isSystem, isError }) => {
    // Determine background and styling based on message type
    const getBubbleStyles = () => {
        if (isError) {
            return {
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(239, 68, 68, 0.12) 100%)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.35)'
            };
        }
        if (isSystem) {
            return {
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(59, 130, 246, 0.25)'
            };
        }
        if (isUser) {
            return {
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(139, 92, 246, 0.3)'
            };
        }
        // Default AI response
        return {
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
            borderColor: 'rgba(255, 255, 255, 0.12)'
        };
    };

    const styles = getBubbleStyles();

    const getLabel = () => {
        if (isError) return { text: 'Error', icon: <AlertCircle size={10} />, color: 'text-red-400' };
        if (isSystem) return { text: 'System', icon: <Info size={10} />, color: 'text-blue-400' };
        if (isUser) return { text: 'You', icon: null, color: 'text-purple-300' };
        return { text: 'Chronos AI', icon: null, color: 'text-blue-300' };
    };

    const label = getLabel();

    return (
        <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex w-full mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div
                className={`max-w-[85%] px-4 py-3 rounded-[14px] text-[0.85rem] leading-[1.5] relative border transition-all duration-200 hover:scale-[1.01]
                ${isUser
                        ? 'rounded-br-[4px] text-white'
                        : 'rounded-bl-[4px] text-slate-100'
                    }
                ${isError ? 'text-red-200' : ''}
                ${isSystem ? 'text-blue-200' : ''}
                `}
                style={{
                    background: styles.background,
                    backdropFilter: styles.backdropFilter,
                    boxShadow: styles.boxShadow,
                    borderColor: styles.borderColor
                }}
            >
                {/* Label for non-user messages */}
                {label && (
                    <span className={`flex items-center gap-1 text-[0.65rem] font-medium mb-1 opacity-80 uppercase tracking-wide ${label.color}`}>
                        {label.icon}
                        {label.text}
                    </span>
                )}

                {/* Markdown rendered content for AI responses, plain text for user */}
                {isUser ? (
                    <p>{message}</p>
                ) : (
                    <div className="markdown-content">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // Headings
                                h1: ({ children }) => (
                                    <h1 className="text-lg font-bold text-blue-300 mt-3 mb-2 first:mt-0">
                                        {children}
                                    </h1>
                                ),
                                h2: ({ children }) => (
                                    <h2 className="text-base font-semibold text-blue-200 mt-3 mb-1.5 first:mt-0">
                                        {children}
                                    </h2>
                                ),
                                h3: ({ children }) => (
                                    <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1 first:mt-0">
                                        {children}
                                    </h3>
                                ),
                                // Bold and italic
                                strong: ({ children }) => (
                                    <strong className="font-semibold text-white">{children}</strong>
                                ),
                                em: ({ children }) => (
                                    <em className="italic text-slate-300">{children}</em>
                                ),
                                // Paragraphs
                                p: ({ children }) => (
                                    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                                ),
                                // Lists
                                ul: ({ children }) => (
                                    <ul className="list-disc list-inside mb-2 space-y-1 pl-1">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className="list-decimal list-inside mb-2 space-y-1 pl-1">{children}</ol>
                                ),
                                li: ({ children }) => (
                                    <li className="text-slate-200">{children}</li>
                                ),
                                // Tables
                                table: ({ children }) => (
                                    <div className="overflow-x-auto my-2 rounded-lg border border-white/10">
                                        <table className="w-full text-xs border-collapse">
                                            {children}
                                        </table>
                                    </div>
                                ),
                                thead: ({ children }) => (
                                    <thead className="bg-white/10">{children}</thead>
                                ),
                                tbody: ({ children }) => (
                                    <tbody className="divide-y divide-white/5">{children}</tbody>
                                ),
                                tr: ({ children }) => (
                                    <tr className="border-b border-white/5 last:border-b-0">{children}</tr>
                                ),
                                th: ({ children }) => (
                                    <th className="px-2 py-1.5 text-left font-semibold text-blue-300 whitespace-nowrap">
                                        {children}
                                    </th>
                                ),
                                td: ({ children }) => (
                                    <td className="px-2 py-1.5 text-slate-200 whitespace-nowrap">{children}</td>
                                ),
                                // Code
                                code: ({ children, className }) => {
                                    const isInline = !className;
                                    return isInline ? (
                                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-emerald-300">
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="block bg-black/30 p-2 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto my-2">
                                            {children}
                                        </code>
                                    );
                                },
                                pre: ({ children }) => (
                                    <pre className="bg-black/30 p-2 rounded-lg overflow-x-auto my-2">
                                        {children}
                                    </pre>
                                ),
                                // Horizontal rule
                                hr: () => (
                                    <hr className="my-3 border-t border-white/20" />
                                ),
                                // Links
                                a: ({ href, children }) => (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                                    >
                                        {children}
                                    </a>
                                ),
                                // Blockquotes
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-2 border-blue-400/50 pl-3 my-2 text-slate-300 italic">
                                        {children}
                                    </blockquote>
                                ),
                            }}
                        >
                            {message}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ChatBubble;
