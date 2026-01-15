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

    // Calculate percentages and identify dominant signal
    const growthPct = Math.round(signals.growth * 100);
    const flowPct = Math.round(signals.flow * 100);
    const laborPct = Math.round(signals.labor * 100);

    const signalValues = [
        { name: 'GROWTH', value: signals.growth, pct: growthPct },
        { name: 'FLOW', value: signals.flow, pct: flowPct },
        { name: 'LABOR', value: signals.labor, pct: laborPct }
    ].sort((a, b) => b.value - a.value);

    const dominant = signalValues[0];
    const secondary = signalValues[1];

    insights.push('');
    insights.push('══════ PULSE VECTOR ANALYSIS ══════');
    insights.push('');

    // Growth signal breakdown
    const growthLevel = signals.growth >= 0.7 ? 'HIGH' : signals.growth >= 0.4 ? 'MODERATE' : 'LOW';
    insights.push(`GROWTH [${signals.growth.toFixed(2)}] ${createProgressBar(signals.growth)}`);
    insights.push(`  → ${growthPct}% new enrollment activity`);
    if (signals.growth >= 0.7) {
        insights.push('  → Birth registrations driving demand');
        insights.push('  → New settlements: HIGH confidence');
    } else if (signals.growth >= 0.4) {
        insights.push('  → Steady infant enrollments');
        insights.push('  → Population growth: STABLE');
    } else {
        insights.push('  → Mature population profile');
        insights.push('  → New enrollments: BASELINE');
    }
    insights.push('');

    // Flow signal breakdown
    const flowLevel = signals.flow >= 0.7 ? 'HIGH' : signals.flow >= 0.4 ? 'MODERATE' : 'LOW';
    insights.push(`FLOW [${signals.flow.toFixed(2)}] ${createProgressBar(signals.flow)}`);
    insights.push(`  → ${flowPct}% demographic movement`);
    if (signals.flow >= 0.7) {
        insights.push('  → Significant migration detected');
        insights.push('  → Address updates: ELEVATED');
    } else if (signals.flow >= 0.4) {
        insights.push('  → Normal population mobility');
        insights.push('  → Address updates: STANDARD');
    } else {
        insights.push('  → Stable resident population');
        insights.push('  → Migration: MINIMAL');
    }
    insights.push('');

    // Labor signal breakdown
    const laborLevel = signals.labor >= 0.7 ? 'HIGH' : signals.labor >= 0.4 ? 'MODERATE' : 'LOW';
    insights.push(`LABOR [${signals.labor.toFixed(2)}] ${createProgressBar(signals.labor)}`);
    insights.push(`  → ${laborPct}% biometric update rate`);
    if (signals.labor >= 0.7) {
        insights.push('  → Active working population');
        insights.push('  → Industrial activity: HIGH');
    } else if (signals.labor >= 0.4) {
        insights.push('  → Normal workforce activity');
        insights.push('  → Employment updates: STEADY');
    } else {
        insights.push('  → Lower workforce density');
        insights.push('  → Update frequency: BASELINE');
    }

    insights.push('');
    insights.push('══════ STRATEGIC ASSESSMENT ══════');
    insights.push('');

    // Dominant driver analysis
    insights.push(`DOMINANT DRIVER: ${dominant.name} (${dominant.pct}%)`);
    if (dominant.name === 'GROWTH') {
        insights.push('  → New family enrollments peaking');
        const capacityIncrease = Math.round(dominant.value * 25);
        insights.push(`  → Deploy infant-friendly centres`);
    } else if (dominant.name === 'FLOW') {
        insights.push('  → Migration corridor active');
        insights.push('  → Mobile units at transit hubs');
    } else {
        insights.push('  → Working population updates');
        insights.push('  → Evening slots critical');
    }

    // Secondary signal if significant
    if (secondary.value >= 0.4) {
        insights.push('');
        insights.push(`SECONDARY: ${secondary.name} (${secondary.pct}%)`);
        if (secondary.name === 'LABOR') {
            insights.push('  → Evening demand expected');
            insights.push('  → Extend hours: 6PM-8PM');
        } else if (secondary.name === 'FLOW') {
            insights.push('  → Monitor migration points');
        } else {
            insights.push('  → Support child enrollment');
        }
    }

    // Capacity projection
    const avgSignal = (signals.growth + signals.flow + signals.labor) / 3;
    const capacityNeeded = Math.round(avgSignal * 30);
    insights.push('');
    if (capacityNeeded >= 20) {
        insights.push(`🔴 DEMAND PROJECTION: +${capacityNeeded}% capacity`);
    } else if (capacityNeeded >= 10) {
        insights.push(`🟡 DEMAND PROJECTION: +${capacityNeeded}% capacity`);
    } else {
        insights.push(`🟢 DEMAND PROJECTION: Adequate (+${capacityNeeded}%)`);
    }

    return insights;
}

// Generate actionable recommendations for district-level view
function generateDistrictActions(signals: SignalData, hotspot: HotspotData): string[] {
    const actions: string[] = [];

    // Calculate percentages and estimate volumes
    const growthPct = Math.round(signals.growth * 100);
    const flowPct = Math.round(signals.flow * 100);
    const laborPct = Math.round(signals.labor * 100);

    // Estimate monthly enrollments based on signal (scaled for district size)
    // Use Math.round which handles negatives correctly
    const estEnrollments = Math.round(signals.growth * 1000);
    const estUpdates = Math.round(signals.labor * 800);
    const estMigration = Math.round(signals.flow * 500);

    // Check if all signals are negative (declining demand)
    const allNegative = signals.growth < 0 && signals.flow < 0 && signals.labor < 0;
    const averageSignal = (signals.growth + signals.flow + signals.labor) / 3;

    // Identify primary signal (for negative values, we want the LEAST negative = highest value)
    const signalValues = [
        { name: 'GROWTH', value: signals.growth, pct: growthPct, est: estEnrollments, unit: 'enrollments' },
        { name: 'FLOW', value: signals.flow, pct: flowPct, est: estMigration, unit: 'migrations' },
        { name: 'LABOR', value: signals.labor, pct: laborPct, est: estUpdates, unit: 'updates' }
    ].sort((a, b) => b.value - a.value);

    const primary = signalValues[0];
    const secondary = signalValues[1];
    const tertiary = signalValues[2];

    actions.push('');
    actions.push('══════ INTERVENTION ANALYSIS ══════');
    actions.push('');

    // Primary signal with detailed breakdown - handle negative values
    actions.push(`PRIMARY SIGNAL: ${primary.name} @ ${primary.value.toFixed(2)}`);
    actions.push('┌─────────────────────────────────┐');

    if (allNegative || averageSignal < 0) {
        // All signals declining - show appropriate messaging
        if (primary.name === 'GROWTH') {
            actions.push('│ Child Enrolment Declining      │');
            actions.push(`│ Est. ${primary.est} enrolments/mo     │`);
        } else if (primary.name === 'FLOW') {
            actions.push('│ Migration Activity Declining   │');
            actions.push(`│ Est. ${primary.est} address updates/mo│`);
        } else {
            actions.push('│ Workforce Update Activity      │');
            actions.push(`│ Est. ${primary.est} biometric updates  │`);
        }
    } else {
        if (primary.name === 'GROWTH') {
            actions.push('│ Child Enrolment Surge Detected │');
            actions.push(`│ Est. +${primary.est} new enrolments/mo  │`);
        } else if (primary.name === 'FLOW') {
            actions.push('│ Migration Corridor Active      │');
            actions.push(`│ Est. +${primary.est} address updates/mo │`);
        } else {
            actions.push('│ Workforce Update Activity      │');
            actions.push(`│ Est. +${primary.est} biometric updates  │`);
        }
    }
    actions.push('└─────────────────────────────────┘');
    actions.push('');

    // Calculate required interventions based on intensity
    // Only calculate positive stations if intensity is actually positive and demand is growing
    const effectiveIntensity = allNegative ? 0 : Math.max(0, hotspot.intensity);
    const stationsNeeded = Math.max(1, Math.round(effectiveIntensity * 4));
    const staffNeeded = Math.max(1, Math.round(effectiveIntensity * 5));

    actions.push('REQUIRED ACTIONS (by priority):');
    actions.push('');

    // Priority 1: Capacity - CHECK FOR NEGATIVE/DECLINING SIGNALS FIRST
    if (allNegative || averageSignal < 0) {
        // Declining demand - don't recommend adding stations!
        actions.push('1. CAPACITY [SUFFICIENT]');
        actions.push('   → Demand signals declining');
        actions.push('   → Current infrastructure adequate');
        actions.push('   → Consider reallocation to high-demand areas');
    } else if (hotspot.intensity >= 0.7) {
        actions.push('1. CAPACITY [CRITICAL]');
        actions.push(`   → Add +${stationsNeeded} enrolment stations`);
        if (primary.name === 'GROWTH') {
            actions.push('   → Focus: Maternity wards, PHCs');
        } else if (primary.name === 'FLOW') {
            actions.push('   → Focus: Transit hubs, stations');
        } else {
            actions.push('   → Focus: Industrial zones, markets');
        }
        actions.push('   → Timeline: Immediate');
    } else if (hotspot.intensity >= 0.4) {
        actions.push('1. CAPACITY [HIGH]');
        actions.push(`   → Add +${stationsNeeded} station(s)`);
        actions.push('   → Timeline: 2-4 weeks');
    } else {
        actions.push('1. CAPACITY [ADEQUATE]');
        actions.push('   → Current infrastructure sufficient');
        actions.push('   → Review in next quarter');
    }
    actions.push('');

    // Priority 2: Staffing
    if (hotspot.intensity >= 0.5) {
        actions.push('2. STAFFING [HIGH]');
        actions.push(`   → +${staffNeeded} operators needed`);
        if (primary.name === 'GROWTH') {
            actions.push('   → Training: Infant biometrics');
        } else if (primary.name === 'LABOR') {
            actions.push('   → Training: Quick updates');
        }
    } else {
        actions.push('2. STAFFING [NORMAL]');
        actions.push('   → Current team adequate');
    }
    actions.push('');

    // Priority 3: Timing/Scheduling
    actions.push('3. TIMING [MEDIUM]');
    if (signals.labor >= 0.5) {
        actions.push('   → Peak hours: 6PM-8PM');
        actions.push('   → Add evening slots');
    } else if (signals.growth >= 0.5) {
        actions.push('   → Peak hours: 10AM-1PM');
        actions.push('   → Morning slots for families');
    } else {
        actions.push('   → Standard hours sufficient');
    }

    // Secondary signal recommendations
    if (secondary.value >= 0.4) {
        actions.push('');
        actions.push(`${secondary.name} SIGNAL @ ${secondary.value.toFixed(2)} (${secondary.pct}%)`);
        if (secondary.name === 'FLOW') {
            actions.push('  → Monitor migration points');
            actions.push('  → Transit hub presence');
        } else if (secondary.name === 'LABOR') {
            actions.push('  → Evening slots: +2 stations');
            actions.push('  → Industrial area outreach');
        } else {
            actions.push('  → Child-friendly facilities');
            actions.push('  → School partnership drives');
        }
    }

    // Tertiary signal if notable
    if (tertiary.value >= 0.3) {
        actions.push('');
        actions.push(`${tertiary.name} SIGNAL @ ${tertiary.value.toFixed(2)} (${tertiary.pct}%)`);
        actions.push('  → Baseline monitoring active');
    }

    actions.push('');
    actions.push('─────────────────────────────────');
    actions.push('💬 ASK CHRONOS FOR DEEPER ANALYSIS');

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
                state: stateData.name,
                signals: stateData.signals
            };
        } else {
            const districtData = data as DistrictTerminalData;
            return {
                name: districtData.district_name,
                type: 'district' as const,
                state: districtData.state_name,
                signals: districtData.signals
            };
        }
    }, [type, data]);

    // Session ID based on location for chat history scoping
    // This ensures chat history is kept per-district but clears when switching
    const sessionId = useMemo(() => {
        if (type === 'state') {
            const stateData = data as StateTerminalData;
            return stateData.state_id;
        } else {
            const districtData = data as DistrictTerminalData;
            return districtData.district_id;
        }
    }, [type, data]);

    // Initialize chat hook with session scoping
    const { messages: chatMessages, isStreaming, connectionStatus, sendMessage } = useTerminalChat({
        enabled: enableChat && isComplete,
        sessionId,
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

    // Get the current streaming message text for scroll dependency
    const streamingMessageText = chatMessages.find(m => m.isStreaming)?.text || '';

    // Auto-scroll content as new lines appear (for district terminal)
    useEffect(() => {
        if (contentRef.current && type === 'district') {
            // Use requestAnimationFrame for smooth, real-time scrolling during streaming
            // During streaming, use instant scroll to avoid animation conflicts
            // When not streaming, use smooth scroll for polished feel
            requestAnimationFrame(() => {
                if (contentRef.current) {
                    if (isStreaming) {
                        // Instant scroll during streaming - no jitter
                        contentRef.current.scrollTop = contentRef.current.scrollHeight;
                    } else {
                        // Smooth scroll when content settles
                        contentRef.current.scrollTo({
                            top: contentRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        }
    }, [displayedInsightLines, chatMessages, type, isStreaming, streamingMessageText]);

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
