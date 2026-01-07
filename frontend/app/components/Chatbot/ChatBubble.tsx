import React from 'react';
import { motion } from 'framer-motion';

interface ChatBubbleProps {
    message: string;
    isUser: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex w-full mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div
                className={`max-w-[85%] px-4 py-2.5 rounded-[12px] text-[0.85rem] leading-[1.45] text-slate-100 shadow-sm relative
                ${isUser
                        ? 'rounded-br-none text-white'
                        : 'rounded-bl-none text-slate-100 border border-white/10'
                    }`}
                style={{
                    background: isUser
                        ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' // Blue to Purple gradient
                        : 'rgba(255, 255, 255, 0.08)', // Glassy bot background
                    backdropFilter: isUser ? 'none' : 'blur(8px)',
                    boxShadow: isUser
                        ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                        : '0 2px 12px rgba(0, 0, 0, 0.15)'
                }}
            >
                {/* Bot Label */}
                {!isUser && (
                    <span className="block text-[0.65rem] font-medium text-blue-300 mb-1 opacity-80 uppercase tracking-wide">
                        Chronos AI
                    </span>
                )}

                {message.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-1' : ''}>
                        {line}
                    </p>
                ))}
            </div>
        </motion.div>
    );
};

export default ChatBubble;
