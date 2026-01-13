"use client";

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import SignalCard from './SignalCard';
import styles from './SignalBreakdown.module.css';

export interface SignalData {
    growth: number | null | undefined;
    flow: number | null | undefined;
    labor: number | null | undefined;
}

export interface SignalBreakdownProps {
    signals: SignalData | null | undefined;
    previousSignals?: SignalData | null;
    trend?: string;
    historicalData?: SignalData[];
    loading?: boolean;
    compact?: boolean;
    nationalAverages?: SignalData;
    lastUpdated?: Date | string;
    showComposite?: boolean;
    tooltipPosition?: 'left' | 'right' | 'top' | 'bottom';
}

/**
 * Calculate composite intensity from signals
 */
function calculateCompositeIntensity(signals: SignalData | null | undefined): {
    value: number;
    level: 'low' | 'medium' | 'high';
    color: string;
} | null {
    if (!signals) return null;

    const { growth, flow, labor } = signals;

    // Check if all signals are valid
    const validGrowth = growth !== null && growth !== undefined && Number.isFinite(growth);
    const validFlow = flow !== null && flow !== undefined && Number.isFinite(flow);
    const validLabor = labor !== null && labor !== undefined && Number.isFinite(labor);

    if (!validGrowth && !validFlow && !validLabor) return null;

    // Weighted average (0.3 growth, 0.4 flow, 0.3 labor)
    let sum = 0;
    let weight = 0;

    if (validGrowth) { sum += (growth as number) * 0.3; weight += 0.3; }
    if (validFlow) { sum += (flow as number) * 0.4; weight += 0.4; }
    if (validLabor) { sum += (labor as number) * 0.3; weight += 0.3; }

    const value = weight > 0 ? sum / weight : 0;

    // Normalize to 0-1 range (assuming -3 to +3 range)
    const normalized = (Math.max(-3, Math.min(3, value)) + 3) / 6;

    let level: 'low' | 'medium' | 'high';
    let color: string;

    if (normalized < 0.33) {
        level = 'low';
        color = '#938F99';
    } else if (normalized < 0.66) {
        level = 'medium';
        color = '#FFE082';
    } else {
        level = 'high';
        color = '#EFB8C8';
    }

    return { value: normalized, level, color };
}

const CompositeIndicator = memo(function CompositeIndicator({
    composite
}: {
    composite: { value: number; level: string; color: string };
}) {
    const percentage = Math.round(composite.value * 100);

    return (
        <div className={styles.compositeIndicator}>
            <div className={styles.compositeLabel}>
                <span>Composite Intensity</span>
                <span
                    className={styles.compositeValue}
                    style={{ color: composite.color }}
                >
                    {percentage}%
                </span>
            </div>
            <div className={styles.compositeBar}>
                <motion.div
                    className={styles.compositeFill}
                    style={{ background: composite.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </div>
            <span
                className={styles.compositeLevel}
                style={{ color: composite.color }}
            >
                {composite.level.toUpperCase()}
            </span>
        </div>
    );
});

const SignalBreakdown = memo(function SignalBreakdown({
    signals,
    previousSignals,
    trend,
    historicalData,
    loading = false,
    compact = false,
    nationalAverages,
    lastUpdated,
    showComposite = false,
    tooltipPosition = 'left',
}: SignalBreakdownProps) {
    // Handle undefined/null signals object
    const safeSignals = useMemo(() => {
        if (!signals) {
            return { growth: null, flow: null, labor: null };
        }
        return {
            growth: signals.growth ?? null,
            flow: signals.flow ?? null,
            labor: signals.labor ?? null,
        };
    }, [signals]);

    // Extract sparkline data for each signal type
    const sparklineData = useMemo(() => {
        if (!historicalData || historicalData.length < 2) {
            return { growth: [], flow: [], labor: [] };
        }

        return {
            growth: historicalData.map(d => d?.growth ?? null),
            flow: historicalData.map(d => d?.flow ?? null),
            labor: historicalData.map(d => d?.labor ?? null),
        };
    }, [historicalData]);

    // Calculate individual trends
    const trends = useMemo(() => {
        const defaultTrends = { growth: 'stable' as const, flow: 'stable' as const, labor: 'stable' as const };

        if (!previousSignals) return defaultTrends;

        const getTrend = (current: number | null | undefined, previous: number | null | undefined): 'rising' | 'falling' | 'stable' => {
            if (current === null || current === undefined || !Number.isFinite(current)) return 'stable';
            if (previous === null || previous === undefined || !Number.isFinite(previous)) return 'stable';
            if (current > previous * 1.05) return 'rising';
            if (current < previous * 0.95) return 'falling';
            return 'stable';
        };

        return {
            growth: getTrend(safeSignals.growth, previousSignals.growth),
            flow: getTrend(safeSignals.flow, previousSignals.flow),
            labor: getTrend(safeSignals.labor, previousSignals.labor),
        };
    }, [safeSignals, previousSignals]);

    // Calculate composite intensity
    const composite = useMemo(() => {
        if (!showComposite) return null;
        return calculateCompositeIntensity(safeSignals);
    }, [safeSignals, showComposite]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <motion.div
            className={`${styles.container} ${compact ? styles.compact : ''}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Composite Indicator */}
            {composite && (
                <motion.div variants={itemVariants} className={styles.compositeWrapper}>
                    <CompositeIndicator composite={composite} />
                </motion.div>
            )}

            <motion.div variants={itemVariants}>
                <SignalCard
                    type="growth"
                    value={safeSignals.growth}
                    previousValue={previousSignals?.growth}
                    trend={trends.growth}
                    sparklineData={sparklineData.growth}
                    loading={loading}
                    lastUpdated={lastUpdated}
                    nationalAverage={nationalAverages?.growth ?? undefined}
                    tooltipPosition={tooltipPosition}
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <SignalCard
                    type="flow"
                    value={safeSignals.flow}
                    previousValue={previousSignals?.flow}
                    trend={trends.flow}
                    sparklineData={sparklineData.flow}
                    loading={loading}
                    lastUpdated={lastUpdated}
                    nationalAverage={nationalAverages?.flow ?? undefined}
                    tooltipPosition={tooltipPosition}
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <SignalCard
                    type="labor"
                    value={safeSignals.labor}
                    previousValue={previousSignals?.labor}
                    trend={trends.labor}
                    sparklineData={sparklineData.labor}
                    loading={loading}
                    lastUpdated={lastUpdated}
                    nationalAverage={nationalAverages?.labor ?? undefined}
                    tooltipPosition={tooltipPosition}
                />
            </motion.div>
        </motion.div>
    );
});

export default SignalBreakdown;
