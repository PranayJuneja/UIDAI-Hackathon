"use client";

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import styles from './ConfidenceBand.module.css';

export interface ConfidenceBandData {
    month: string;
    predicted: number;
    lower: number;
    upper: number;
}

export interface ConfidenceBandProps {
    data: ConfidenceBandData[];
    xScale: (month: string) => number | undefined;
    yScale: (value: number) => number;
    color?: string;
    opacity?: number;
}

const ConfidenceBand = memo(function ConfidenceBand({
    data,
    xScale,
    yScale,
    color = '#D0BCFF',
    opacity = 0.2,
}: ConfidenceBandProps) {
    // Generate the area path for the confidence band
    const bandPath = useMemo(() => {
        if (!data || data.length < 2) return '';

        // Build upper bound path
        const upperPoints = data.map(d => {
            const x = xScale(d.month) || 0;
            const y = yScale(d.upper);
            return `${x},${y}`;
        });

        // Build lower bound path (reversed for closing the shape)
        const lowerPoints = [...data].reverse().map(d => {
            const x = xScale(d.month) || 0;
            const y = yScale(d.lower);
            return `${x},${y}`;
        });

        return `M ${upperPoints[0]} L ${upperPoints.join(' L ')} L ${lowerPoints.join(' L ')} Z`;
    }, [data, xScale, yScale]);

    // Generate the predicted line path
    const linePath = useMemo(() => {
        if (!data || data.length < 2) return '';

        const points = data.map(d => {
            const x = xScale(d.month) || 0;
            const y = yScale(d.predicted);
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    }, [data, xScale, yScale]);

    if (!data || data.length < 2) return null;

    return (
        <g className={styles.confidenceBand}>
            {/* Confidence band area */}
            <motion.path
                d={bandPath}
                fill={color}
                fillOpacity={opacity}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
            />

            {/* Predicted line (dashed) */}
            <motion.path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            />

            {/* Upper bound line */}
            <motion.path
                d={`M ${data.map(d => `${xScale(d.month) || 0},${yScale(d.upper)}`).join(' L ')}`}
                fill="none"
                stroke={color}
                strokeWidth={1}
                strokeOpacity={0.4}
                strokeDasharray="3 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            />

            {/* Lower bound line */}
            <motion.path
                d={`M ${data.map(d => `${xScale(d.month) || 0},${yScale(d.lower)}`).join(' L ')}`}
                fill="none"
                stroke={color}
                strokeWidth={1}
                strokeOpacity={0.4}
                strokeDasharray="3 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            />
        </g>
    );
});

export default ConfidenceBand;
