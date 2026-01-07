"use client";

import { motion } from "framer-motion";
import IndiaMap from "./components/Map/IndiaMap";
import { useMapStore } from "./stores/mapStore";
import styles from "./dashboard.module.css";

export default function Dashboard() {
    const { selectedState, selectedMonth, states } = useMapStore();
    const selectedStateData = states.find(s => s.state_id === selectedState);

    return (
        <main className={styles.dashboard}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <motion.div
                        className={styles.logo}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className={styles.logoIcon}>⏱</div>
                        <span className={styles.logoText}>Chronos-X</span>
                    </motion.div>

                    <div className={styles.monthBadge}>
                        <span className={styles.monthLabel}>Viewing</span>
                        <span className={styles.monthValue}>{selectedMonth}</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className={styles.content}>
                {/* Left Panel - Map */}
                <section className={styles.mapSection}>
                    <motion.div
                        className={styles.mapWrapper}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <IndiaMap />
                    </motion.div>
                </section>

                {/* Right Panel - Details */}
                <aside className={styles.sidebar}>
                    {/* Stats Overview */}
                    <motion.div
                        className={styles.statsCard}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className={styles.cardTitle}>
                            {selectedStateData ? selectedStateData.name : 'India Overview'}
                        </h2>

                        {selectedStateData ? (
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
                            <div className={styles.overview}>
                                <div className={styles.overviewStat}>
                                    <span className={styles.overviewValue}>{states.length}</span>
                                    <span className={styles.overviewLabel}>States</span>
                                </div>
                                <div className={styles.overviewStat}>
                                    <span className={styles.overviewValue}>
                                        {states.filter(s => s.hotspot.intensity > 0.5).length}
                                    </span>
                                    <span className={styles.overviewLabel}>Hotspots</span>
                                </div>
                                <p className={styles.hint}>
                                    Click on a state to see details
                                </p>
                            </div>
                        )}
                    </motion.div>

                    {/* Top Hotspots */}
                    <motion.div
                        className={styles.hotspotsCard}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h3 className={styles.cardTitle}>🔥 Top Hotspots</h3>
                        <div className={styles.hotspotsList}>
                            {states
                                .sort((a, b) => b.hotspot.intensity - a.hotspot.intensity)
                                .slice(0, 5)
                                .map((state, i) => (
                                    <motion.div
                                        key={state.state_id}
                                        className={styles.hotspotItem}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + (i * 0.1) }}
                                    >
                                        <span className={styles.hotspotRank}>{i + 1}</span>
                                        <span className={styles.hotspotName}>{state.name}</span>
                                        <span
                                            className={styles.hotspotIntensity}
                                            style={{
                                                color: state.hotspot.intensity > 0.66 ? 'var(--hotspot-high)' :
                                                    state.hotspot.intensity > 0.33 ? 'var(--hotspot-medium)' :
                                                        'var(--hotspot-low)'
                                            }}
                                        >
                                            {Math.round(state.hotspot.intensity * 100)}%
                                        </span>
                                    </motion.div>
                                ))}
                        </div>
                    </motion.div>
                </aside>
            </div>
        </main>
    );
}
