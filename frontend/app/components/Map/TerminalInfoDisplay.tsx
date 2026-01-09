'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
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

export default function TerminalInfoDisplay({
    type,
    data,
    layout,
    onComplete,
    onClose
}: TerminalInfoDisplayProps) {
    const [displayedLines, setDisplayedLines] = useState<string[]>([]);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    // Use ref to track if onComplete has been called to prevent double-firing
    const hasCompletedRef = useRef(false);
    const onCompleteRef = useRef(onComplete);

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
            result.push('');
            result.push('[DATA LOADED SUCCESSFULLY]');
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
            }, currentLine.length === 0 ? 20 : 5); // Fast typing: 5ms per char, 20ms for empty lines

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
            }, 3000); // 3 second pause to let user read the data
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
            <div className={styles.content}>
                {displayedLines.map((line, index) => (
                    <div key={index} className={styles.line}>
                        <span className={styles.text}>{line}</span>
                        {/* Blinking cursor on current line */}
                        {index === currentLineIndex && !isComplete && (
                            <span className={styles.cursor}>█</span>
                        )}
                    </div>
                ))}
                {/* Show cursor on last line when complete */}
                {isComplete && (
                    <div className={styles.line}>
                        <span className={styles.cursor}>█</span>
                    </div>
                )}
            </div>

            {/* Depth shadow layers */}
            <div className={styles.depthShadow1} />
            <div className={styles.depthShadow2} />
        </motion.div>
    );
}
