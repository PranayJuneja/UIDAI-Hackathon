'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    enableChat?: boolean;
}

// Helper to create progress bar
function createProgressBar(value: number, maxWidth: number = 10): string {
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

// Generate strategic insights for state-level view
function generateStateInsights(signals: SignalData, hotspot: HotspotData, trend?: string): string[] {
    const insights: string[] = [];
    insights.push('');
    insights.push('══════ STRATEGIC INSIGHTS ══════');
    insights.push('');

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

    if (signals.labor > 0.7) {
        insights.push('');
        insights.push('👷 HIGH LABOR ACTIVITY');
        insights.push('   → Working population updates frequent');
        insights.push('   → Extend centre hours to 8PM');
    }

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

// Generate actionable recommendations for district-level view
function generateDistrictActions(signals: SignalData, hotspot: HotspotData): string[] {
    const actions: string[] = [];
    actions.push('');
    actions.push('══════ RECOMMENDED ACTIONS ══════');
    actions.push('');

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
    enableChat = layout === 'side'
}: TerminalInfoDisplayProps) {
    // Animation phases: 'showing_main' -> 'pause1' -> 'showing_insights' -> 'pause2' -> 'complete'
    const [animationPhase, setAnimationPhase] = useState<'showing_main' | 'pause1' | 'showing_insights' | 'pause2' | 'complete'>('showing_main');
    const [displayedInsightLines, setDisplayedInsightLines] = useState<string[]>([]);
    const [insightLineIndex, setInsightLineIndex] = useState(0);
    const [showFinalLine, setShowFinalLine] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

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

    // Generate ALL lines immediately - no state needed for main lines, they show instantly
    const { mainLines, insightLines, finalLine } = useMemo(() => {
        const main: string[] = [];
        const insights: string[] = [];
        let final = '';

        main.push('▸ CHRONOS-X TERMINAL v2.6.0');
        main.push('═══════════════════════════════════════');
        main.push('');

        if (type === 'state') {
            const stateData = data as StateTerminalData;
            main.push(`> ACCESSING: ${stateData.name}_`);
            main.push(`> STATE_ID: ${stateData.state_id}`);
            if (stateData.districts !== undefined) {
                main.push(`> DISTRICTS: ${formatNumber(stateData.districts)}`);
            }
            if (stateData.pincodes !== undefined) {
                main.push(`> PINCODES: ${formatNumber(stateData.pincodes)}`);
            }
            main.push('');
            main.push('══════ SIGNAL ANALYSIS ══════');
            main.push('');
            main.push(`├─ GROWTH:  ${createProgressBar(stateData.signals.growth)} ${stateData.signals.growth.toFixed(2)}`);
            main.push(`├─ FLOW:    ${createProgressBar(stateData.signals.flow)} ${stateData.signals.flow.toFixed(2)}`);
            main.push(`└─ LABOR:   ${createProgressBar(stateData.signals.labor)} ${stateData.signals.labor.toFixed(2)}`);
            main.push('');
            main.push(`> HOTSPOT: ${getHotspotLevel(stateData.hotspot.intensity)} (${stateData.hotspot.intensity.toFixed(2)})`);
            main.push(`> TREND: ${getTrendArrow(stateData.trend)} ${(stateData.trend || 'STABLE').toUpperCase()}`);

            const stateInsights = generateStateInsights(stateData.signals, stateData.hotspot, stateData.trend);
            insights.push(...stateInsights);

            final = '[INITIALIZING DISTRICT VIEW...]';
        } else {
            const districtData = data as DistrictTerminalData;
            main.push(`> ACCESSING: ${districtData.district_name}_`);
            main.push(`> DISTRICT_ID: ${districtData.district_id}`);
            main.push(`> STATE: ${districtData.state_name}`);
            if (districtData.pin_count !== undefined) {
                main.push(`> PINCODES: ${formatNumber(districtData.pin_count)}`);
            }
            main.push('');
            main.push('══════ SIGNAL ANALYSIS ══════');
            main.push('');
            main.push(`├─ GROWTH:  ${createProgressBar(districtData.signals.growth)} ${districtData.signals.growth.toFixed(2)}`);
            main.push(`├─ FLOW:    ${createProgressBar(districtData.signals.flow)} ${districtData.signals.flow.toFixed(2)}`);
            main.push(`└─ LABOR:   ${createProgressBar(districtData.signals.labor)} ${districtData.signals.labor.toFixed(2)}`);
            main.push('');
            main.push(`> HOTSPOT: ${getHotspotLevel(districtData.hotspot.intensity)} (${districtData.hotspot.intensity.toFixed(2)})`);

            const actions = generateDistrictActions(districtData.signals, districtData.hotspot);
            insights.push(...actions);
        }

        return { mainLines: main, insightLines: insights, finalLine: final };
    }, [type, data]);

    // Auto-scroll content as new lines appear (for district terminal)
    useEffect(() => {
        if (contentRef.current && type === 'district') {
            // Smooth scroll to bottom
            contentRef.current.scrollTo({
                top: contentRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [displayedInsightLines, chatMessages, type]);

    // Animation state machine
    useEffect(() => {
        // Phase 1: Main content is already showing (burst is instant via render)
        // After small delay, move to pause phase
        if (animationPhase === 'showing_main') {
            const timer = setTimeout(() => {
                setAnimationPhase('pause1');
            }, 50); // Tiny delay just to ensure render happened
            return () => clearTimeout(timer);
        }

        // Phase 2: Pause after burst (1s for state, 0.5s for district)
        if (animationPhase === 'pause1') {
            const pauseDuration = type === 'state' ? 1000 : 500;
            const timer = setTimeout(() => {
                setAnimationPhase('showing_insights');
                setInsightLineIndex(0);
            }, pauseDuration);
            return () => clearTimeout(timer);
        }

        // Phase 3: Show insights/actions line by line (fast)
        if (animationPhase === 'showing_insights') {
            if (insightLineIndex < insightLines.length) {
                const timer = setTimeout(() => {
                    setDisplayedInsightLines(prev => [...prev, insightLines[insightLineIndex]]);
                    setInsightLineIndex(prev => prev + 1);
                }, 30); // Fast line-by-line reveal
                return () => clearTimeout(timer);
            } else {
                // All insights shown
                if (type === 'state' && finalLine) {
                    setAnimationPhase('pause2');
                } else {
                    setAnimationPhase('complete');
                    setIsComplete(true);
                }
            }
        }

        // Phase 4: Pause before showing final line (state only)
        if (animationPhase === 'pause2') {
            const timer = setTimeout(() => {
                setShowFinalLine(true);
                setAnimationPhase('complete');
                setIsComplete(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [animationPhase, insightLineIndex, insightLines, finalLine, type]);

    // Handle completion callback - for overlay mode
    useEffect(() => {
        if (isComplete && layout === 'overlay' && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            const timeout = setTimeout(() => {
                if (onCompleteRef.current) {
                    onCompleteRef.current();
                }
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [isComplete, layout]);

    // Reset when data changes
    useEffect(() => {
        setDisplayedInsightLines([]);
        setInsightLineIndex(0);
        setShowFinalLine(false);
        setAnimationPhase('showing_main');
        setIsComplete(false);
        hasCompletedRef.current = false;
    }, [data]);

    // ===== RENDER FOR STATE TYPE (split layout) =====
    if (type === 'state') {
        return (
            <motion.div
                className={`${styles.terminal} ${styles.overlay}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
                <div className={styles.scanlines} />
                <div className={styles.glow} />

                {/* Split content container */}
                <div className={styles.splitContent}>
                    {/* Left Column - Main info (ALWAYS visible - burst effect) */}
                    <div className={styles.leftColumn}>
                        <div className={styles.content}>
                            {mainLines.map((line, index) => (
                                <div key={index} className={styles.line}>
                                    <span className={styles.text}>{line}</span>
                                </div>
                            ))}

                            {/* Cursor while waiting for insights */}
                            {animationPhase === 'pause1' && (
                                <div className={styles.line}>
                                    <span className={styles.cursor}>█</span>
                                </div>
                            )}

                            {/* Final line after pause2 */}
                            {showFinalLine && finalLine && (
                                <motion.div
                                    className={styles.line}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <span className={styles.text}>{finalLine}</span>
                                    <span className={styles.cursor}>█</span>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Strategic Insights (appears after pause) */}
                    <AnimatePresence>
                        {(animationPhase === 'showing_insights' || animationPhase === 'pause2' || animationPhase === 'complete') && (
                            <motion.div
                                className={styles.rightColumn}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className={styles.content}>
                                    {displayedInsightLines.map((line, index) => (
                                        <div key={index} className={styles.line}>
                                            <span className={styles.text}>{line}</span>
                                        </div>
                                    ))}

                                    {/* Cursor while typing insights */}
                                    {animationPhase === 'showing_insights' && insightLineIndex < insightLines.length && (
                                        <div className={styles.line}>
                                            <span className={styles.cursor}>█</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className={styles.depthShadow1} />
                <div className={styles.depthShadow2} />
            </motion.div>
        );
    }

    // ===== RENDER FOR DISTRICT TYPE (single column with auto-scroll) =====
    return (
        <motion.div
            className={`${styles.terminal} ${layout === 'overlay' ? styles.overlay : styles.side}`}
            initial={{ opacity: 0, scale: layout === 'overlay' ? 0.95 : 1, x: layout === 'side' ? 50 : 0 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: layout === 'overlay' ? 1.05 : 1, x: layout === 'side' ? 50 : 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
            <div className={styles.scanlines} />
            <div className={styles.glow} />

            {/* Close button for side layout */}
            {layout === 'side' && onClose && (
                <button className={styles.closeButton} onClick={onClose} aria-label="Close terminal">
                    ✕
                </button>
            )}

            {/* Terminal content */}
            <div className={styles.content} ref={contentRef}>
                {/* Main lines (ALWAYS visible - burst effect) */}
                {mainLines.map((line, index) => (
                    <div key={`main-${index}`} className={styles.line}>
                        <span className={styles.text}>{line}</span>
                    </div>
                ))}

                {/* Cursor while waiting */}
                {animationPhase === 'pause1' && (
                    <div className={styles.line}>
                        <span className={styles.cursor}>█</span>
                    </div>
                )}

                {/* Insight/Action lines (after pause) */}
                {displayedInsightLines.map((line, index) => (
                    <div key={`insight-${index}`} className={styles.line}>
                        <span className={styles.text}>{line}</span>
                    </div>
                ))}

                {/* Cursor while showing insights */}
                {animationPhase === 'showing_insights' && insightLineIndex < insightLines.length && (
                    <div className={styles.line}>
                        <span className={styles.cursor}>█</span>
                    </div>
                )}

                {/* Chat messages section */}
                {enableChat && isComplete && chatMessages.length > 0 && (
                    <div className={styles.chatSection} ref={chatContainerRef}>
                        {chatMessages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`${styles.chatMessage} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
                            >
                                <span className={styles.chatRole}>
                                    {msg.role === 'user' ? '> YOU:' : '> CHRONOS:'}
                                </span>
                                <div className={styles.chatText}>
                                    {msg.role === 'user' ? (
                                        msg.text
                                    ) : (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: ({ children }) => <span className={styles.mdHeading}>{children}</span>,
                                                h2: ({ children }) => <span className={styles.mdHeading}>{children}</span>,
                                                h3: ({ children }) => <span className={styles.mdSubheading}>{children}</span>,
                                                strong: ({ children }) => <span className={styles.mdBold}>{children}</span>,
                                                em: ({ children }) => <span className={styles.mdItalic}>{children}</span>,
                                                p: ({ children }) => <span className={styles.mdParagraph}>{children}</span>,
                                                ul: ({ children }) => <span className={styles.mdList}>{children}</span>,
                                                ol: ({ children }) => <span className={styles.mdList}>{children}</span>,
                                                li: ({ children }) => <span className={styles.mdListItem}>• {children}</span>,
                                                code: ({ children }) => <span className={styles.mdCode}>{children}</span>,
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    )}
                                    {msg.isStreaming && <span className={styles.cursor}>█</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Show cursor on last line when complete and no chat */}
                {isComplete && !enableChat && (
                    <div className={styles.line}>
                        <span className={styles.cursor}>█</span>
                    </div>
                )}
            </div>

            {/* Chat input section */}
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

            <div className={styles.depthShadow1} />
            <div className={styles.depthShadow2} />
        </motion.div>
    );
}
