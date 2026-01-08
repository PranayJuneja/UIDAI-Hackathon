"use client";

import React, { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './SignalCard.module.css';

export interface SignalCardProps {
    type: 'growth' | 'flow' | 'labor';
    value: number | null | undefined;
    previousValue?: number | null;
    trend?: 'rising' | 'falling' | 'stable';
    sparklineData?: (number | null)[];
    loading?: boolean;
    lastUpdated?: Date | string;
    nationalAverage?: number;
}

const SIGNAL_CONFIG = {
    growth: {
        icon: '👶',
        label: 'Growth',
        description: 'New settlements (0-5 age)',
        color: 'var(--signal-growth)',
        colorRaw: '#4DB6AC',
        gradient: 'var(--gradient-growth)',
    },
    flow: {
        icon: '🚶',
        label: 'Flow',
        description: 'Migration patterns',
        color: 'var(--signal-flow)',
        colorRaw: '#D0BCFF',
        gradient: 'var(--gradient-flow)',
    },
    labor: {
        icon: '💪',
        label: 'Labor',
        description: 'Workforce intensity',
        color: 'var(--signal-labor)',
        colorRaw: '#FFE082',
        gradient: 'var(--gradient-labor)',
    },
};

// Constants for value handling
const VALUE_CLAMP_MIN = -10;
const VALUE_CLAMP_MAX = 10;
const STALE_THRESHOLD_HOURS = 24;

/**
 * Validate and normalize a numeric value
 */
function normalizeValue(value: number | null | undefined): {
    display: string;
    isValid: boolean;
    clamped: number;
    wasClipped: boolean;
} {
    // Handle null/undefined
    if (value === null || value === undefined) {
        return { display: 'N/A', isValid: false, clamped: 0, wasClipped: false };
    }

    // Handle NaN/Infinity
    if (!Number.isFinite(value)) {
        return { display: 'N/A', isValid: false, clamped: 0, wasClipped: false };
    }

    // Clamp extreme values
    const wasClipped = value < VALUE_CLAMP_MIN || value > VALUE_CLAMP_MAX;
    const clamped = Math.max(VALUE_CLAMP_MIN, Math.min(VALUE_CLAMP_MAX, value));

    return {
        display: clamped.toFixed(2),
        isValid: true,
        clamped,
        wasClipped
    };
}

/**
 * Check if data is stale
 */
function isDataStale(lastUpdated?: Date | string): boolean {
    if (!lastUpdated) return false;

    const updateTime = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;
    const hoursSinceUpdate = (Date.now() - updateTime.getTime()) / (1000 * 60 * 60);

    return hoursSinceUpdate > STALE_THRESHOLD_HOURS;
}

/**
 * Calculate percentage change between two values
 */
function calculatePercentChange(current: number, previous: number | null | undefined): {
    percent: number;
    formatted: string;
    isPositive: boolean;
    isSignificant: boolean;
} | null {
    if (previous === null || previous === undefined || !Number.isFinite(previous) || previous === 0) {
        return null;
    }

    const percent = ((current - previous) / Math.abs(previous)) * 100;
    const isPositive = percent > 0;
    const isSignificant = Math.abs(percent) > 5;

    return {
        percent,
        formatted: `${isPositive ? '+' : ''}${percent.toFixed(1)}%`,
        isPositive,
        isSignificant,
    };
}

const TrendArrow = memo(function TrendArrow({
    trend,
    ariaLabel
}: {
    trend: 'rising' | 'falling' | 'stable';
    ariaLabel: string;
}) {
    if (trend === 'stable') {
        return (
            <span
                className={`${styles.trendArrow} ${styles.stable}`}
                role="img"
                aria-label={ariaLabel}
            >
                →
            </span>
        );
    }

    return (
        <motion.span
            className={`${styles.trendArrow} ${styles[trend]}`}
            initial={{ y: trend === 'rising' ? 5 : -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            role="img"
            aria-label={ariaLabel}
        >
            {trend === 'rising' ? '↑' : '↓'}
        </motion.span>
    );
});

const Sparkline = memo(function Sparkline({
    data,
    color
}: {
    data: (number | null)[];
    color: string;
}) {
    const pathData = useMemo(() => {
        // Filter out null values and ensure we have valid data
        const validData = data.filter((v): v is number => v !== null && Number.isFinite(v));
        if (validData.length < 2) return '';

        const width = 60;
        const height = 24;
        const padding = 2;

        const maxVal = Math.max(...validData);
        const minVal = Math.min(...validData);
        const range = maxVal - minVal || 1;

        const points = validData.map((val, i) => {
            const x = padding + (i / (validData.length - 1)) * (width - padding * 2);
            const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    }, [data]);

    const validData = data.filter((v): v is number => v !== null && Number.isFinite(v));
    if (validData.length < 2) return null;

    return (
        <svg
            className={styles.sparkline}
            viewBox="0 0 60 24"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={`sparkGradient-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="1" />
                </linearGradient>
            </defs>
            <motion.path
                d={pathData}
                fill="none"
                stroke={`url(#sparkGradient-${color})`}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            />
        </svg>
    );
});

const PercentBadge = memo(function PercentBadge({
    change
}: {
    change: { formatted: string; isPositive: boolean; isSignificant: boolean };
}) {
    return (
        <span
            className={`${styles.percentBadge} ${change.isPositive ? styles.positive : styles.negative} ${change.isSignificant ? styles.significant : ''}`}
            aria-label={`${change.isPositive ? 'Increased' : 'Decreased'} by ${change.formatted}`}
        >
            {change.formatted}
        </span>
    );
});

const Tooltip = memo(function Tooltip({
    config,
    value,
    percentChange,
    nationalAverage,
    isStale
}: {
    config: typeof SIGNAL_CONFIG['growth'];
    value: ReturnType<typeof normalizeValue>;
    percentChange: ReturnType<typeof calculatePercentChange>;
    nationalAverage?: number;
    isStale: boolean;
}) {
    return (
        <div className={styles.tooltip} role="tooltip">
            <div className={styles.tooltipHeader}>
                <span>{config.icon}</span>
                <span>{config.label} Signal</span>
            </div>
            <div className={styles.tooltipContent}>
                <div className={styles.tooltipRow}>
                    <span>Current Value:</span>
                    <span className={styles.tooltipValue}>{value.display}</span>
                </div>
                {value.wasClipped && (
                    <div className={styles.tooltipWarning}>
                        ⚠️ Value was clipped from extreme range
                    </div>
                )}
                {percentChange && (
                    <div className={styles.tooltipRow}>
                        <span>Change:</span>
                        <span className={`${styles.tooltipValue} ${percentChange.isPositive ? styles.positive : styles.negative}`}>
                            {percentChange.formatted}
                        </span>
                    </div>
                )}
                {nationalAverage !== undefined && Number.isFinite(nationalAverage) && (
                    <div className={styles.tooltipRow}>
                        <span>National Avg:</span>
                        <span className={styles.tooltipValue}>{nationalAverage.toFixed(2)}</span>
                    </div>
                )}
                {isStale && (
                    <div className={styles.tooltipWarning}>
                        ⚠️ Data may be outdated
                    </div>
                )}
            </div>
        </div>
    );
});

const SignalCard = memo(function SignalCard({
    type,
    value,
    previousValue,
    trend,
    sparklineData,
    loading = false,
    lastUpdated,
    nationalAverage,
}: SignalCardProps) {
    const config = SIGNAL_CONFIG[type];
    const [showTooltip, setShowTooltip] = useState(false);

    // Normalize and validate the value
    const normalizedValue = useMemo(() => normalizeValue(value), [value]);

    // Check data freshness
    const isStale = useMemo(() => isDataStale(lastUpdated), [lastUpdated]);

    // Calculate percentage change
    const percentChange = useMemo(() => {
        if (!normalizedValue.isValid) return null;
        return calculatePercentChange(normalizedValue.clamped, previousValue);
    }, [normalizedValue, previousValue]);

    // Calculate trend if not provided
    const calculatedTrend = useMemo(() => {
        if (trend) return trend;
        if (!normalizedValue.isValid) return 'stable';
        if (previousValue === undefined || previousValue === null || !Number.isFinite(previousValue)) {
            return 'stable';
        }
        if (normalizedValue.clamped > previousValue * 1.05) return 'rising';
        if (normalizedValue.clamped < previousValue * 0.95) return 'falling';
        return 'stable';
    }, [trend, normalizedValue, previousValue]);

    // ARIA label for accessibility
    const ariaLabel = useMemo(() => {
        const trendText = calculatedTrend === 'rising' ? 'increasing' :
            calculatedTrend === 'falling' ? 'decreasing' : 'stable';
        return `${config.label} signal: ${normalizedValue.display}, ${trendText}${isStale ? ', data may be outdated' : ''}`;
    }, [config.label, normalizedValue.display, calculatedTrend, isStale]);

    if (loading) {
        return (
            <div
                className={`${styles.card} ${styles.loading}`}
                role="status"
                aria-label={`Loading ${config.label} signal`}
            >
                <div className={styles.skeleton} />
            </div>
        );
    }

    return (
        <motion.div
            className={`${styles.card} ${!normalizedValue.isValid ? styles.invalid : ''} ${isStale ? styles.stale : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
            }}
            role="article"
            aria-label={ariaLabel}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            tabIndex={0}
        >
            {/* Glow effect */}
            <div
                className={styles.glow}
                style={{ background: config.gradient }}
                aria-hidden="true"
            />

            {/* Stale data indicator */}
            {isStale && (
                <div className={styles.staleIndicator} title="Data may be outdated">
                    ⏰
                </div>
            )}

            {/* Header */}
            <div className={styles.header}>
                <span className={styles.icon} aria-hidden="true">{config.icon}</span>
                <div className={styles.labelGroup}>
                    <span className={styles.label}>{config.label}</span>
                    <span className={styles.description}>{config.description}</span>
                </div>
            </div>

            {/* Value */}
            <div className={styles.valueSection}>
                <AnimatePresence mode="wait">
                    <motion.span
                        key={normalizedValue.display}
                        className={`${styles.value} ${!normalizedValue.isValid ? styles.naValue : ''}`}
                        style={{ color: normalizedValue.isValid ? config.color : 'var(--text-muted)' }}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {normalizedValue.display}
                    </motion.span>
                </AnimatePresence>

                {normalizedValue.isValid && (
                    <TrendArrow
                        trend={calculatedTrend}
                        ariaLabel={`Trend: ${calculatedTrend}`}
                    />
                )}

                {percentChange && (
                    <PercentBadge change={percentChange} />
                )}
            </div>

            {/* Sparkline */}
            {sparklineData && sparklineData.length > 1 && (
                <div className={styles.sparklineContainer}>
                    <Sparkline data={sparklineData} color={config.colorRaw} />
                </div>
            )}

            {/* Tooltip on hover */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                    >
                        <Tooltip
                            config={config}
                            value={normalizedValue}
                            percentChange={percentChange}
                            nationalAverage={nationalAverage}
                            isStale={isStale}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

export default SignalCard;
