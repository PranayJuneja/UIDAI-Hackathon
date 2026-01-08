import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Info } from 'lucide-react';

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
                background: 'rgba(239, 68, 68, 0.15)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 12px rgba(239, 68, 68, 0.2)',
                borderColor: 'rgba(239, 68, 68, 0.3)'
            };
        }
        if (isSystem) {
            return {
                background: 'rgba(59, 130, 246, 0.1)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 12px rgba(59, 130, 246, 0.1)',
                borderColor: 'rgba(59, 130, 246, 0.2)'
            };
        }
        if (isUser) {
            return {
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                backdropFilter: 'none',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                borderColor: 'transparent'
            };
        }
        // Default AI response
        return {
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
            borderColor: 'rgba(255, 255, 255, 0.1)'
        };
    };

    const styles = getBubbleStyles();

    const getLabel = () => {
        if (isError) return { text: 'Error', icon: <AlertCircle size={10} />, color: 'text-red-400' };
        if (isSystem) return { text: 'System', icon: <Info size={10} />, color: 'text-blue-400' };
        if (!isUser) return { text: 'Chronos AI', icon: null, color: 'text-blue-300' };
        return null;
    };

    const label = getLabel();

    return (
        <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex w-full mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div
                className={`max-w-[85%] px-4 py-2.5 rounded-[12px] text-[0.85rem] leading-[1.45] shadow-sm relative border
                ${isUser
                        ? 'rounded-br-none text-white'
                        : 'rounded-bl-none text-slate-100'
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
