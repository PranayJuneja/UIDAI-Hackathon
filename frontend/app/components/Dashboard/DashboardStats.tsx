import React, { memo } from 'react';
import { motion } from 'framer-motion';
import styles from '../../dashboard.module.css'; // Using the same module for now to avoid breaking styles
import { DistrictData, StateData } from '../../stores/mapStore';

interface DashboardStatsProps {
    title: string;
    loading: boolean;
    viewMode: 'india' | 'state';
    selectedDistrictData?: DistrictData;
    selectedStateData?: StateData;
    stats: {
        count: number;
        countLabel: string;
        items: any[];
    };
}

const DashboardStats = memo(function DashboardStats({
    title,
    loading,
    viewMode,
    selectedDistrictData,
    selectedStateData,
    stats
}: DashboardStatsProps) {
    return (
        <motion.div
            className={styles.statsCard}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
        >
            <h2 className={styles.cardTitle}>{title}</h2>

            {loading ? (
                <div className={styles.loadingState}>Loading details...</div>
            ) : (selectedDistrictData) ? (
                // District Details View
                <div className={styles.stateDetails}>
                    <div className={styles.signalRow}>
                        <span className={styles.signalIcon}>👶</span>
                        <span className={styles.signalName}>Growth</span>
                        <span className={styles.signalValue}>
                            {selectedDistrictData.signals.growth.toFixed(2)}
                        </span>
                    </div>
                    <div className={styles.signalRow}>
                        <span className={styles.signalIcon}>🚶</span>
                        <span className={styles.signalName}>Flow</span>
                        <span className={styles.signalValue}>
                            {selectedDistrictData.signals.flow.toFixed(2)}
                        </span>
                    </div>
                    <div className={styles.signalRow}>
                        <span className={styles.signalIcon}>💪</span>
                        <span className={styles.signalName}>Labor</span>
                        <span className={styles.signalValue}>
                            {selectedDistrictData.signals.labor.toFixed(2)}
                        </span>
                    </div>

                    <div className={styles.divider}></div>

                    <div className={styles.metaRow}>
                        <span>PIN Codes</span>
                        <span>{selectedDistrictData.pin_count?.toLocaleString()}</span>
                    </div>
                    <div className={styles.metaRow}>
                        <span>Hotspot Intensity</span>
                        <span className={styles.intensity}>
                            {Math.round(selectedDistrictData.hotspot.intensity * 100)}%
                        </span>
                    </div>
                </div>
            ) : (selectedStateData && viewMode === 'india') ? (
                // State Details in India View
                <div className={styles.stateDetails}>
                    <div className={styles.signalRow}>
                        <span className={styles.signalIcon}>👶</span>
                        <span className={styles.signalName}>Growth</span>
                        <span className={styles.signalValue}>
                            {selectedStateData.signals.growth.toFixed(2)}
                        </span>
                    </div>
                    <div className={styles.signalRow}>
                        <span className={styles.signalIcon}>🚶</span>
                        <span className={styles.signalName}>Flow</span>
                        <span className={styles.signalValue}>
                            {selectedStateData.signals.flow.toFixed(2)}
                        </span>
                    </div>
                    <div className={styles.signalRow}>
                        <span className={styles.signalIcon}>💪</span>
                        <span className={styles.signalName}>Labor</span>
                        <span className={styles.signalValue}>
                            {selectedStateData.signals.labor.toFixed(2)}
                        </span>
                    </div>

                    <div className={styles.divider}></div>

                    <div className={styles.metaRow}>
                        <span>Districts</span>
                        <span>{selectedStateData.districts}</span>
                    </div>
                    <div className={styles.metaRow}>
                        <span>PIN Codes</span>
                        <span>{selectedStateData.pincodes?.toLocaleString()}</span>
                    </div>
                    <div className={styles.metaRow}>
                        <span>Hotspot Intensity</span>
                        <span className={styles.intensity}>
                            {Math.round(selectedStateData.hotspot.intensity * 100)}%
                        </span>
                    </div>
                </div>
            ) : (
                // Generic Overview (India or Drilled State)
                <div className={styles.overview}>
                    <div className={styles.overviewStat}>
                        <span className={styles.overviewValue}>{stats.count}</span>
                        <span className={styles.overviewLabel}>{stats.countLabel}</span>
                    </div>
                    {viewMode !== 'state' || !selectedDistrictData ? (
                        <div className={styles.overviewStat}>
                            <span className={styles.overviewValue}>
                                {stats.items.filter((i: any) => (i.hotspot?.intensity || 0) > 0.5).length}
                            </span>
                            <span className={styles.overviewLabel}>Hotspots</span>
                        </div>
                    ) : null}
                    <p className={styles.hint}>
                        {viewMode === 'india'
                            ? "Click on a state to drill down"
                            : "Click on a district for details"}
                    </p>
                </div>
            )}
        </motion.div>
    );
});

export default DashboardStats;
