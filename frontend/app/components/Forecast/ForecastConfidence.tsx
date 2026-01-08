"use client";

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import styles from './ForecastConfidence.module.css';

interface SignalData {
    growth: number;
    flow: number;
    labor: number;
}

export interface ForecastConfidenceProps {
    confidence: number; // 0-1 scale
    forecast?: SignalData;
    actual?: SignalData;
    horizon?: '1m' | '3m' | '6m';
    showDetails?: boolean;
}

const HORIZON_LABELS = {
    '1m': '1 Month',
    '3m': '3 Months',
    '6m': '6 Months',
};

const ForecastConfidence = memo(function ForecastConfidence({
    confidence,
    forecast,
    actual,
    horizon = '1m',
    showDetails = true,
}: ForecastConfidenceProps) {
    // Handle null/undefined/NaN confidence
    const isInvalidConfidence = confidence === null || confidence === undefined || !Number.isFinite(confidence);

    // Clamp confidence between 0 and 1
    const safeConfidence = isInvalidConfidence ? 0 : Math.max(0, Math.min(1, confidence as number));

    // Special states
    const isPerfect = safeConfidence >= 0.99;
    const isInsufficient = safeConfidence < 0.1 || isInvalidConfidence;

    // Calculate gauge parameters
    const gaugeParams = useMemo(() => {
        const radius = 60;
        const strokeWidth = 10;
        const circumference = 2 * Math.PI * radius;
        const startAngle = -210; // Start from bottom-left
        const sweepAngle = 240; // Sweep 240 degrees

        // Arc path
        const arcLength = (sweepAngle / 360) * circumference;
        const filledLength = arcLength * safeConfidence;

        return {
            radius,
            strokeWidth,
            circumference,
            arcLength,
            filledLength,
            startAngle,
            sweepAngle,
        };
    }, [safeConfidence]);

    // Determine confidence level and color
    const confidenceLevel = useMemo(() => {
        if (isInvalidConfidence) return { label: 'No Data', color: '#938F99', class: styles.insufficient };
        if (isPerfect) return { label: 'Perfect', color: '#4DB6AC', class: styles.perfect };
        if (safeConfidence >= 0.8) return { label: 'High', color: '#4DB6AC', class: styles.high };
        if (safeConfidence >= 0.5) return { label: 'Medium', color: '#FFE082', class: styles.medium };
        if (safeConfidence >= 0.2) return { label: 'Low', color: '#EFB8C8', class: styles.low };
        return { label: 'Insufficient', color: '#938F99', class: styles.insufficient };
    }, [safeConfidence, isInvalidConfidence, isPerfect]);

    // Calculate forecast accuracy if both forecast and actual are provided
    const accuracy = useMemo(() => {
        if (!forecast || !actual) return null;

        const calculateError = (pred: number | null | undefined, act: number | null | undefined) => {
            // Handle null/undefined/NaN values
            if (pred === null || pred === undefined || !Number.isFinite(pred)) return 1;
            if (act === null || act === undefined || !Number.isFinite(act)) return 1;
            if (act === 0) return pred === 0 ? 0 : 1;
            return Math.abs(pred - act) / Math.abs(act);
        };

        const growthError = calculateError(forecast.growth, actual.growth);
        const flowError = calculateError(forecast.flow, actual.flow);
        const laborError = calculateError(forecast.labor, actual.labor);

        const avgError = (growthError + flowError + laborError) / 3;
        // Clamp accuracy to 0-100% range
        const accuracyPercent = Math.max(0, Math.min(100, (1 - avgError) * 100));

        return {
            overall: accuracyPercent,
            growth: Math.max(0, Math.min(100, (1 - growthError) * 100)),
            flow: Math.max(0, Math.min(100, (1 - flowError) * 100)),
            labor: Math.max(0, Math.min(100, (1 - laborError) * 100)),
        };
    }, [forecast, actual]);

    // SVG arc path
    const createArcPath = (radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(75, 75, radius, endAngle);
        const end = polarToCartesian(75, 75, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    };

    const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
        const radians = (angle - 90) * Math.PI / 180;
        return {
            x: cx + radius * Math.cos(radians),
            y: cy + radius * Math.sin(radians),
        };
    };

    const backgroundArc = createArcPath(
        gaugeParams.radius,
        gaugeParams.startAngle,
        gaugeParams.startAngle + gaugeParams.sweepAngle
    );

    const valueArc = createArcPath(
        gaugeParams.radius,
        gaugeParams.startAngle,
        gaugeParams.startAngle + (gaugeParams.sweepAngle * safeConfidence)
    );

    return (
        <div className={styles.container}>
            {/* Gauge */}
            <div className={styles.gaugeContainer}>
                <svg
                    viewBox="0 0 150 130"
                    className={styles.gauge}
                >
                    <defs>
                        <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#EFB8C8" />
                            <stop offset="50%" stopColor="#FFE082" />
                            <stop offset="100%" stopColor="#4DB6AC" />
                        </linearGradient>
                    </defs>

                    {/* Background arc */}
                    <path
                        d={backgroundArc}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth={gaugeParams.strokeWidth}
                        strokeLinecap="round"
                    />

                    {/* Value arc */}
                    <motion.path
                        d={valueArc}
                        fill="none"
                        stroke={confidenceLevel.color}
                        strokeWidth={gaugeParams.strokeWidth}
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />

                    {/* Center text */}
                    <text
                        x="75"
                        y="70"
                        textAnchor="middle"
                        className={styles.gaugeValue}
                    >
                        {Math.round(safeConfidence * 100)}%
                    </text>
                    <text
                        x="75"
                        y="90"
                        textAnchor="middle"
                        className={styles.gaugeLabel}
                    >
                        Confidence
                    </text>
                </svg>

                {/* Confidence badge */}
                <div className={`${styles.confidenceBadge} ${confidenceLevel.class}`}>
                    {confidenceLevel.label}
                </div>
            </div>

            {/* Details */}
            {showDetails && (
                <div className={styles.details}>
                    <div className={styles.horizonRow}>
                        <span className={styles.horizonLabel}>Forecast Horizon</span>
                        <span className={styles.horizonValue}>{HORIZON_LABELS[horizon]}</span>
                    </div>

                    {accuracy && (
                        <>
                            <div className={styles.divider} />
                            <div className={styles.accuracySection}>
                                <span className={styles.sectionTitle}>Prediction Accuracy</span>
                                <div className={styles.accuracyGrid}>
                                    <div className={styles.accuracyItem}>
                                        <span className={styles.accuracyLabel}>Growth</span>
                                        <span className={styles.accuracyValue} style={{
                                            color: accuracy.growth >= 80 ? '#4DB6AC' :
                                                accuracy.growth >= 50 ? '#FFE082' : '#EFB8C8'
                                        }}>
                                            {accuracy.growth.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className={styles.accuracyItem}>
                                        <span className={styles.accuracyLabel}>Flow</span>
                                        <span className={styles.accuracyValue} style={{
                                            color: accuracy.flow >= 80 ? '#4DB6AC' :
                                                accuracy.flow >= 50 ? '#FFE082' : '#EFB8C8'
                                        }}>
                                            {accuracy.flow.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className={styles.accuracyItem}>
                                        <span className={styles.accuracyLabel}>Labor</span>
                                        <span className={styles.accuracyValue} style={{
                                            color: accuracy.labor >= 80 ? '#4DB6AC' :
                                                accuracy.labor >= 50 ? '#FFE082' : '#EFB8C8'
                                        }}>
                                            {accuracy.labor.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Low confidence warning */}
                    {safeConfidence < 0.5 && (
                        <motion.div
                            className={styles.warning}
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <span className={styles.warningIcon}>⚠️</span>
                            <span>Low confidence - interpret with caution</span>
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
});

export default ForecastConfidence;
