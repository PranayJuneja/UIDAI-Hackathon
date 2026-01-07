"use client";

import { motion } from 'framer-motion';
import styles from './MapTooltip.module.css';

interface TooltipProps {
    x: number;
    y: number;
    isDistrict?: boolean;
    data: {
        name?: string;
        district_name?: string;
        state_id?: string;
        state_name?: string;
        signals?: {
            growth: number;
            flow: number;
            labor: number;
        };
        hotspot?: {
            intensity: number;
        };
        districts?: number;
        pincodes?: number;
        pin_count?: number;
    };
}

export default function MapTooltip({ x, y, data, isDistrict }: TooltipProps) {
    // Position tooltip to avoid going off-screen
    const adjustedX = x + 20;
    const adjustedY = y - 10;

    // Determine title to display
    const title = isDistrict
        ? (data.district_name || 'Unknown District')
        : (data.name || data.state_id);

    return (
        <motion.div
            className={styles.tooltip}
            style={{
                left: adjustedX,
                top: adjustedY,
            }}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
        >
            <div className={styles.header}>
                <div>
                    <h3>{title}</h3>
                    {isDistrict && data.state_name && (
                        <span className={styles.subHeader}>{data.state_name}</span>
                    )}
                </div>
                {data.hotspot && (
                    <span
                        className={styles.intensityBadge}
                        style={{
                            background: data.hotspot.intensity > 0.66 ? 'var(--hotspot-high)' :
                                data.hotspot.intensity > 0.33 ? 'var(--hotspot-medium)' :
                                    'var(--hotspot-low)'
                        }}
                    >
                        {Math.round(data.hotspot.intensity * 100)}%
                    </span>
                )}
            </div>

            {data.signals && (
                <div className={styles.signals}>
                    <div className={styles.signal}>
                        <span className={styles.signalIcon}>👶</span>
                        <span className={styles.signalLabel}>Growth</span>
                        <span className={styles.signalValue} style={{ color: 'var(--signal-growth)' }}>
                            {data.signals.growth.toFixed(2)}
                        </span>
                    </div>
                    <div className={styles.signal}>
                        <span className={styles.signalIcon}>🚶</span>
                        <span className={styles.signalLabel}>Flow</span>
                        <span className={styles.signalValue} style={{ color: 'var(--signal-flow)' }}>
                            {data.signals.flow.toFixed(2)}
                        </span>
                    </div>
                    <div className={styles.signal}>
                        <span className={styles.signalIcon}>💪</span>
                        <span className={styles.signalLabel}>Labor</span>
                        <span className={styles.signalValue} style={{ color: 'var(--signal-labor)' }}>
                            {data.signals.labor.toFixed(2)}
                        </span>
                    </div>
                </div>
            )}

            <div className={styles.meta}>
                {!isDistrict && data.districts && <span>{data.districts} Districts</span>}
                {(data.pincodes || data.pin_count) && (
                    <span>{(data.pincodes || data.pin_count || 0).toLocaleString()} PINs</span>
                )}
            </div>

            <div className={styles.hint}>
                {isDistrict ? 'Click to select' : 'Click to explore →'}
            </div>
        </motion.div>
    );
}
