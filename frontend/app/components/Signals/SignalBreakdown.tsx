"use client";

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import SignalCard from './SignalCard';
import styles from './SignalBreakdown.module.css';

export interface SignalData {
    growth: number;
    flow: number;
    labor: number;
}

export interface SignalBreakdownProps {
    signals: SignalData;
    previousSignals?: SignalData;
    trend?: string;
    historicalData?: SignalData[];
    loading?: boolean;
    compact?: boolean;
}

const SignalBreakdown = memo(function SignalBreakdown({
    signals,
    previousSignals,
    trend,
    historicalData,
    loading = false,
    compact = false,
}: SignalBreakdownProps) {
    // Extract sparkline data for each signal type
    const sparklineData = useMemo(() => {
        if (!historicalData || historicalData.length < 2) {
            return { growth: [], flow: [], labor: [] };
        }

        return {
            growth: historicalData.map(d => d.growth),
            flow: historicalData.map(d => d.flow),
            labor: historicalData.map(d => d.labor),
        };
    }, [historicalData]);

    // Calculate individual trends
    const trends = useMemo(() => {
        if (!previousSignals) {
            return { growth: 'stable' as const, flow: 'stable' as const, labor: 'stable' as const };
        }

        const getTrend = (current: number, previous: number): 'rising' | 'falling' | 'stable' => {
            if (current > previous * 1.05) return 'rising';
            if (current < previous * 0.95) return 'falling';
            return 'stable';
        };

        return {
            growth: getTrend(signals.growth, previousSignals.growth),
            flow: getTrend(signals.flow, previousSignals.flow),
            labor: getTrend(signals.labor, previousSignals.labor),
        };
    }, [signals, previousSignals]);

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
            <motion.div variants={itemVariants}>
                <SignalCard
                    type="growth"
                    value={signals.growth}
                    previousValue={previousSignals?.growth}
                    trend={trends.growth}
                    sparklineData={sparklineData.growth}
                    loading={loading}
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <SignalCard
                    type="flow"
                    value={signals.flow}
                    previousValue={previousSignals?.flow}
                    trend={trends.flow}
                    sparklineData={sparklineData.flow}
                    loading={loading}
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <SignalCard
                    type="labor"
                    value={signals.labor}
                    previousValue={previousSignals?.labor}
                    trend={trends.labor}
                    sparklineData={sparklineData.labor}
                    loading={loading}
                />
            </motion.div>
        </motion.div>
    );
});

export default SignalBreakdown;
