"use client";

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './SignalCard.module.css';

export interface SignalCardProps {
    type: 'growth' | 'flow' | 'labor';
    value: number;
    previousValue?: number;
    trend?: 'rising' | 'falling' | 'stable';
    sparklineData?: number[];
    loading?: boolean;
}

const SIGNAL_CONFIG = {
    growth: {
        icon: '👶',
        label: 'Growth',
        description: 'New settlements (0-5 age)',
        color: 'var(--signal-growth)',
        gradient: 'var(--gradient-growth)',
    },
    flow: {
        icon: '🚶',
        label: 'Flow',
        description: 'Migration patterns',
        color: 'var(--signal-flow)',
        gradient: 'var(--gradient-flow)',
    },
    labor: {
        icon: '💪',
        label: 'Labor',
        description: 'Workforce intensity',
        color: 'var(--signal-labor)',
        gradient: 'var(--gradient-labor)',
    },
};

const TrendArrow = memo(function TrendArrow({ trend }: { trend: 'rising' | 'falling' | 'stable' }) {
    if (trend === 'stable') {
        return (
            <span className={`${styles.trendArrow} ${styles.stable}`}>
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
        >
            {trend === 'rising' ? '↑' : '↓'}
        </motion.span>
    );
});

const Sparkline = memo(function Sparkline({
    data,
    color
}: {
    data: number[];
    color: string;
}) {
    const pathData = useMemo(() => {
        if (!data || data.length < 2) return '';

        const width = 60;
        const height = 24;
        const padding = 2;

        const maxVal = Math.max(...data);
        const minVal = Math.min(...data);
        const range = maxVal - minVal || 1;

        const points = data.map((val, i) => {
            const x = padding + (i / (data.length - 1)) * (width - padding * 2);
            const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    }, [data]);

    if (!data || data.length < 2) return null;

    return (
        <svg
            className={styles.sparkline}
            viewBox="0 0 60 24"
            preserveAspectRatio="none"
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

const SignalCard = memo(function SignalCard({
    type,
    value,
    previousValue,
    trend,
    sparklineData,
    loading = false,
}: SignalCardProps) {
    const config = SIGNAL_CONFIG[type];

    // Calculate trend if not provided
    const calculatedTrend = useMemo(() => {
        if (trend) return trend;
        if (previousValue === undefined) return 'stable';
        if (value > previousValue * 1.05) return 'rising';
        if (value < previousValue * 0.95) return 'falling';
        return 'stable';
    }, [trend, value, previousValue]);

    // Format value for display
    const displayValue = useMemo(() => {
        return value.toFixed(2);
    }, [value]);

    if (loading) {
        return (
            <div className={`${styles.card} ${styles.loading}`}>
                <div className={styles.skeleton} />
            </div>
        );
    }

    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
            }}
        >
            {/* Glow effect */}
            <div
                className={styles.glow}
                style={{ background: config.gradient }}
            />

            {/* Header */}
            <div className={styles.header}>
                <span className={styles.icon}>{config.icon}</span>
                <div className={styles.labelGroup}>
                    <span className={styles.label}>{config.label}</span>
                    <span className={styles.description}>{config.description}</span>
                </div>
            </div>

            {/* Value */}
            <div className={styles.valueSection}>
                <AnimatePresence mode="wait">
                    <motion.span
                        key={displayValue}
                        className={styles.value}
                        style={{ color: config.color }}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {displayValue}
                    </motion.span>
                </AnimatePresence>
                <TrendArrow trend={calculatedTrend} />
            </div>

            {/* Sparkline */}
            {sparklineData && sparklineData.length > 1 && (
                <div className={styles.sparklineContainer}>
                    <Sparkline data={sparklineData} color={config.color} />
                </div>
            )}
        </motion.div>
    );
});

export default SignalCard;
