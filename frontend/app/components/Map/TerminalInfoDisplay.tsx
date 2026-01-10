'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTerminalChat } from '../../hooks/useTerminalChat';
import styles from './TerminalInfoDisplay.module.css';

// Types
interface SignalData {
    growth: number;
    flow: number;
    labor: number;
}

interface HotspotData {
    intensity: number;
    level?: string;
}

interface StateTerminalData {
    name: string;
    state_id: string;
    signals: SignalData;
    hotspot: HotspotData;
    districts?: number;
    pincodes?: number;
    trend?: string;
}

interface DistrictTerminalData {
    district_name: string;
    district_id: string;
    state_name: string;
    signals: SignalData;
    hotspot: HotspotData;
    pin_count?: number;
    pincodes?: string[];
}

interface TerminalInfoDisplayProps {
    type: 'state' | 'district';
    data: StateTerminalData | DistrictTerminalData;
    layout: 'overlay' | 'side';
    onComplete?: () => void;
    onClose?: () => void;
    enableChat?: boolean; // Enable chat input (default: true for side layout)
}

// Helper to create progress bar
function createProgressBar(value: number, maxWidth: number = 10): string {
    // Clamp value between 0 and 1
    const clampedValue = Math.max(0, Math.min(1, value || 0));
    const filled = Math.round(clampedValue * maxWidth);
    const empty = Math.max(0, maxWidth - filled);
    return '█'.repeat(filled) + '░'.repeat(empty);
}

// Helper to format number with commas
function formatNumber(num: number): string {
    return num.toLocaleString();
}

// Get trend arrow
function getTrendArrow(trend?: string): string {
    if (!trend) return '→';
    switch (trend.toLowerCase()) {
        case 'rising': return '↗';
        case 'falling': return '↘';
        case 'stable': return '→';
        default: return '→';
    }
}

// Get hotspot level display
function getHotspotLevel(intensity: number): string {
    if (intensity >= 0.7) return 'HIGH';
    if (intensity >= 0.5) return 'MEDIUM';
    return 'LOW';
}

// Generate strategic insights for state-level view (India → State)
function generateStateInsights(signals: SignalData, hotspot: HotspotData, trend?: string): string[] {
    const insights: string[] = [];
    insights.push('');
    insights.push('══════ STRATEGIC INSIGHTS ══════');
    insights.push('');

    // Growth analysis
    if (signals.growth > 0.7) {
        insights.push('⚡ HIGH GROWTH DETECTED');
        insights.push('   → New settlements emerging rapidly');
        insights.push('   → Expand enrolment capacity +20%');
    } else if (signals.growth > 0.5) {
        insights.push('📈 MODERATE GROWTH');
        insights.push('   → Steady population increase');
        insights.push('   → Maintain current capacity');
    } else {
        insights.push('📉 LOW GROWTH REGION');
        insights.push('   → Mature demographics');
        insights.push('   → Focus on updates, not new enrolments');
    }

    // Flow analysis  
    if (signals.flow > 0.7) {
        insights.push('');
        insights.push('🚀 HIGH MIGRATION FLOW');
        insights.push('   → Significant in/out movement');
        insights.push('   → Deploy mobile enrolment units');
    } else if (signals.flow > 0.5) {
        insights.push('');
        insights.push('🔄 MODERATE MIGRATION');
        insights.push('   → Normal population mobility');
    }

    // Labor analysis
    if (signals.labor > 0.7) {
        insights.push('');
        insights.push('👷 HIGH LABOR ACTIVITY');
        insights.push('   → Working population updates frequent');
        insights.push('   → Extend centre hours to 8PM');
    }

    // Hotspot recommendation
    insights.push('');
    if (hotspot.intensity >= 0.7) {
        insights.push('🔴 PRIORITY: HIGH DEMAND ZONE');
        insights.push('   → Immediate capacity review needed');
    } else if (hotspot.intensity >= 0.5) {
        insights.push('🟡 ATTENTION: MODERATE DEMAND');
        insights.push('   → Monitor for capacity planning');
    } else {
        insights.push('🟢 STATUS: DEMAND UNDER CONTROL');
        insights.push('   → Routine operations sufficient');
    }

    return insights;
}

// Generate actionable recommendations for district-level view (State → District)
function generateDistrictActions(signals: SignalData, hotspot: HotspotData): string[] {
    const actions: string[] = [];
    actions.push('');
    actions.push('══════ RECOMMENDED ACTIONS ══════');
    actions.push('');

    // Prioritized action items based on hotspot intensity
    if (hotspot.intensity >= 0.7) {
        actions.push('⚠️  URGENT ACTIONS REQUIRED:');
        actions.push('    1. Add 2-3 new permanent centres');
        actions.push('    2. Deploy mobile enrolment vans');
        actions.push('    3. Extend hours to 8PM daily');
        actions.push('    4. Weekend operations mandatory');
    } else if (hotspot.intensity >= 0.5) {
        actions.push('📋 SUGGESTED IMPROVEMENTS:');
        actions.push('    1. Add 1 additional centre');
        actions.push('    2. Enable Saturday operations');
        actions.push('    3. Add staff during peak hours');
    } else {
        actions.push('✅ CAPACITY ADEQUATE');
        actions.push('    → Current setup meets demand');
        actions.push('    → Monitor quarterly for changes');
    }

    // Signal-specific actions
    if (signals.flow > 0.6) {
        actions.push('');
        actions.push('📍 MIGRATION RESPONSE:');
        actions.push('    → Setup camps at transit hubs');
        actions.push('    → Railway/bus station kiosks');
    }

    if (signals.labor > 0.7) {
        actions.push('');
        actions.push('🏭 LABOR ZONE SUPPORT:');
        actions.push('    → Partner with industrial estates');
        actions.push('    → Evening slots 6PM-9PM essential');
    }

    if (signals.growth > 0.7) {
        actions.push('');
        actions.push('🏘️ NEW SETTLEMENT SUPPORT:');
        actions.push('    → Mobile camps in new colonies');
        actions.push('    → Child enrolment drives');
    }

    actions.push('');
    actions.push('─────────────────────────────────');
    actions.push('💬 ASK CHRONOS FOR MORE DETAILS...');

    return actions;
}


export default function TerminalInfoDisplay({
    type,
    data,
    layout,
    onComplete,
    onClose,
    enableChat = layout === 'side' // Enable chat by default for side layout (districts)
}: TerminalInfoDisplayProps) {
    const [displayedLines, setDisplayedLines] = useState<string[]>([]);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Use ref to track if onComplete has been called to prevent double-firing
    const hasCompletedRef = useRef(false);
    const onCompleteRef = useRef(onComplete);

    // Build location context for chat
    const locationContext = useMemo(() => {
        if (type === 'state') {
            const stateData = data as StateTerminalData;
            return {
                name: stateData.name,
                type: 'state' as const,
                signals: stateData.signals
            };
        } else {
            const districtData = data as DistrictTerminalData;
            return {
                name: `${districtData.district_name}, ${districtData.state_name}`,
                type: 'district' as const,
                signals: districtData.signals
            };
        }
    }, [type, data]);

    // Initialize chat hook
    const { messages: chatMessages, isStreaming, connectionStatus, sendMessage } = useTerminalChat({
        enabled: enableChat && isComplete,
        locationContext
    });

    // Scroll chat to bottom when new messages arrive
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    // Handle chat submit
    const handleChatSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim() && !isStreaming) {
            sendMessage(chatInput);
            setChatInput('');
        }
    }, [chatInput, isStreaming, sendMessage]);

    // Keep onComplete ref updated
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Generate terminal lines based on data type - memoized to prevent regeneration
    const lines = useMemo(() => {
        const result: string[] = [];

        result.push('▸ CHRONOS-X TERMINAL v2.6.0');
        result.push('═══════════════════════════════════════');
        result.push('');

        if (type === 'state') {
            const stateData = data as StateTerminalData;
            result.push(`> ACCESSING: ${stateData.name}_`);
            result.push(`> STATE_ID: ${stateData.state_id}`);
            if (stateData.districts !== undefined) {
                result.push(`> DISTRICTS: ${formatNumber(stateData.districts)}`);
            }
            if (stateData.pincodes !== undefined) {
                result.push(`> PINCODES: ${formatNumber(stateData.pincodes)}`);
            }
            result.push('');
            result.push('══════ SIGNAL ANALYSIS ══════');
            result.push('');
            result.push(`├─ GROWTH:  ${createProgressBar(stateData.signals.growth)} ${stateData.signals.growth.toFixed(2)}`);
            result.push(`├─ FLOW:    ${createProgressBar(stateData.signals.flow)} ${stateData.signals.flow.toFixed(2)}`);
            result.push(`└─ LABOR:   ${createProgressBar(stateData.signals.labor)} ${stateData.signals.labor.toFixed(2)}`);
            result.push('');
            result.push(`> HOTSPOT: ${getHotspotLevel(stateData.hotspot.intensity)} (${stateData.hotspot.intensity.toFixed(2)})`);
            result.push(`> TREND: ${getTrendArrow(stateData.trend)} ${(stateData.trend || 'STABLE').toUpperCase()}`);

            // Add strategic insights
            const insights = generateStateInsights(stateData.signals, stateData.hotspot, stateData.trend);
            result.push(...insights);

            result.push('');
            result.push('[INITIALIZING DISTRICT VIEW...]');
        } else {
            const districtData = data as DistrictTerminalData;
            result.push(`> ACCESSING: ${districtData.district_name}_`);
            result.push(`> DISTRICT_ID: ${districtData.district_id}`);
            result.push(`> STATE: ${districtData.state_name}`);
            if (districtData.pin_count !== undefined) {
                result.push(`> PINCODES: ${formatNumber(districtData.pin_count)}`);
            }
            result.push('');
            result.push('══════ SIGNAL ANALYSIS ══════');
            result.push('');
            result.push(`├─ GROWTH:  ${createProgressBar(districtData.signals.growth)} ${districtData.signals.growth.toFixed(2)}`);
            result.push(`├─ FLOW:    ${createProgressBar(districtData.signals.flow)} ${districtData.signals.flow.toFixed(2)}`);
            result.push(`└─ LABOR:   ${createProgressBar(districtData.signals.labor)} ${districtData.signals.labor.toFixed(2)}`);
            result.push('');
            result.push(`> HOTSPOT: ${getHotspotLevel(districtData.hotspot.intensity)} (${districtData.hotspot.intensity.toFixed(2)})`);

            // Add actionable recommendations
            const actions = generateDistrictActions(districtData.signals, districtData.hotspot);
            result.push(...actions);
        }

        return result;
    }, [type, data]);

    const totalLines = lines.length;

    // Typewriter effect
    useEffect(() => {
        if (currentLineIndex >= totalLines) {
            if (!isComplete) {
                setIsComplete(true);
            }
            return;
        }

        const currentLine = lines[currentLineIndex];

        if (currentCharIndex <= currentLine.length) {
            // Type next character
            const timeout = setTimeout(() => {
                setDisplayedLines(prev => {
                    const newLines = [...prev];
                    newLines[currentLineIndex] = currentLine.substring(0, currentCharIndex);
                    return newLines;
                });
                setCurrentCharIndex(prev => prev + 1);
            }, currentLine.length === 0 ? 10 : 1); // Ultra-fast typing: 1ms per char, 10ms for empty lines

            return () => clearTimeout(timeout);
        } else {
            // Move to next line
            setCurrentLineIndex(prev => prev + 1);
            setCurrentCharIndex(0);
        }
    }, [currentLineIndex, currentCharIndex, lines, totalLines, isComplete]);

    // Handle completion callback separately - 3 second pause before transition
    useEffect(() => {
        if (isComplete && layout === 'overlay' && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            const timeout = setTimeout(() => {
                if (onCompleteRef.current) {
                    onCompleteRef.current();
                }
            }, 1500); // 1.5 second pause before transition
            return () => clearTimeout(timeout);
        }
    }, [isComplete, layout]);

    // Reset when data changes
    useEffect(() => {
        setDisplayedLines([]);
        setCurrentLineIndex(0);
        setCurrentCharIndex(0);
        setIsComplete(false);
        hasCompletedRef.current = false;
    }, [data]);

    return (
        <motion.div
            className={`${styles.terminal} ${layout === 'overlay' ? styles.overlay : styles.side}`}
            initial={{ opacity: 0, scale: layout === 'overlay' ? 0.95 : 1, x: layout === 'side' ? 50 : 0 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: layout === 'overlay' ? 1.05 : 1, x: layout === 'side' ? 50 : 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* Scanline overlay */}
            <div className={styles.scanlines} />

            {/* CRT glow effect */}
            <div className={styles.glow} />

            {/* Close button for side layout */}
            {layout === 'side' && onClose && (
                <button className={styles.closeButton} onClick={onClose} aria-label="Close terminal">
                    ✕
                </button>
            )}

            {/* Terminal content */}
            <div className={styles.content} ref={chatContainerRef}>
                {displayedLines.map((line, index) => (
                    <div key={index} className={styles.line}>
                        <span className={styles.text}>{line}</span>
                        {/* Blinking cursor on current line */}
                        {index === currentLineIndex && !isComplete && (
                            <span className={styles.cursor}>█</span>
                        )}
                    </div>
                ))}

                {/* Chat messages section - only show when chat is enabled and complete */}
                {enableChat && isComplete && chatMessages.length > 0 && (
                    <div className={styles.chatSection}>
                        {chatMessages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`${styles.chatMessage} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
                            >
                                <span className={styles.chatRole}>
                                    {msg.role === 'user' ? '> YOU:' : '> CHRONOS:'}
                                </span>
                                <span className={styles.chatText}>
                                    {msg.text}
                                    {msg.isStreaming && <span className={styles.cursor}>█</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Show cursor on last line when complete and no chat active */}
                {isComplete && !enableChat && (
                    <div className={styles.line}>
                        <span className={styles.cursor}>█</span>
                    </div>
                )}
            </div>

            {/* Chat input section - only show for side layout with chat enabled */}
            {enableChat && isComplete && (
                <form className={styles.chatInputArea} onSubmit={handleChatSubmit}>
                    <span className={styles.chatPrompt}>{'>'}</span>
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={connectionStatus === 'connected' ? 'Ask Chronos...' : 'Connecting...'}
                        disabled={connectionStatus !== 'connected' || isStreaming}
                        className={styles.chatInput}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!chatInput.trim() || isStreaming || connectionStatus !== 'connected'}
                        className={styles.chatSendBtn}
                    >
                        ▶
                    </button>
                </form>
            )}

            {/* Depth shadow layers */}
            <div className={styles.depthShadow1} />
            <div className={styles.depthShadow2} />
        </motion.div>
    );
}
