"use client";

import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
    variant?: 'text' | 'textSm' | 'textLg' | 'circular' | 'rectangular' | 'card';
    width?: number | string;
    height?: number | string;
    className?: string;
    animation?: 'shimmer' | 'pulse';
}

/**
 * Skeleton - Animated placeholder for loading states
 */
export default function Skeleton({
    variant = 'text',
    width,
    height,
    className = '',
    animation = 'shimmer'
}: SkeletonProps) {
    const animClass = animation === 'pulse' ? styles.pulse : '';

    return (
        <div
            className={`${styles.skeleton} ${styles[variant]} ${animClass} ${className}`}
            style={{
                width: width,
                height: height
            }}
        />
    );
}

/**
 * SkeletonSignalRow - Pre-composed skeleton for signal rows in DashboardStats
 */
export function SkeletonSignalRow() {
    return (
        <div className={styles.signalRow}>
            <div className={`${styles.skeleton} ${styles.signalIcon}`} />
            <div className={`${styles.skeleton} ${styles.signalName}`} />
            <div className={`${styles.skeleton} ${styles.signalValue}`} />
        </div>
    );
}

/**
 * SkeletonHotspotRow - Pre-composed skeleton for hotspot list items
 */
export function SkeletonHotspotRow() {
    return (
        <div className={styles.hotspotRow}>
            <div className={`${styles.skeleton} ${styles.hotspotRank}`} />
            <div className={`${styles.skeleton} ${styles.hotspotName}`} />
            <div className={`${styles.skeleton} ${styles.hotspotIntensity}`} />
        </div>
    );
}

/**
 * SkeletonStatsCard - Pre-composed skeleton for the entire stats card
 */
export function SkeletonStatsCard() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <SkeletonSignalRow />
            <SkeletonSignalRow />
            <SkeletonSignalRow />
            <div style={{ margin: 'var(--space-3) 0', height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width="80px" height="1em" />
                <Skeleton width="40px" height="1em" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width="100px" height="1em" />
                <Skeleton width="50px" height="1em" />
            </div>
        </div>
    );
}

/**
 * SkeletonHotspotsList - Pre-composed skeleton for the hotspots list
 */
export function SkeletonHotspotsList({ count = 5 }: { count?: number }) {
    return (
        <div>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonHotspotRow key={i} />
            ))}
        </div>
    );
}
