"use client";

import { motion } from "framer-motion";
import IndiaMap from "./components/Map/IndiaMap";
import { useMapStore } from "./stores/mapStore";
import styles from "./dashboard.module.css";

// Generate random particles for ambient effect
const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2.5 + 1.5,
    duration: Math.random() * 20 + 20,  // Slow: 20-40 seconds
    delay: Math.random() * 10,
}));

export default function Dashboard() {
    const {
        selectedState,
        selectedMonth,
        states,
        viewMode,
        selectedStateName,
        districts,
        loadingDistricts,
        selectedDistrict
    } = useMapStore();

    // Get currently selected state object if any
    const selectedStateData = states.find(s => s.state_id === selectedState);

    // Get currently selected district object if any
    const selectedDistrictData = districts.find(d => d.district_name === selectedDistrict);

    // Calculate aggregated stats for the current view
    const stats = selectedDistrictData ? {
        title: selectedDistrictData.district_name,
        countLabel: 'PIN Codes',
        count: selectedDistrictData.pin_count,
        items: [], // No sub-items for district
        loading: false
    } : viewMode === 'state' ? {
        title: `${selectedStateName} Overview`,
        countLabel: 'Districts',
        count: districts.length,
        items: districts,
        loading: loadingDistricts
    } : {
        title: 'India Overview',
        countLabel: 'States',
        count: states.length,
        items: states,
        loading: false
    };

    // Calculate top items for hotspots list
    const topItems = viewMode === 'state'
        ? [...districts].sort((a, b) => b.hotspot.intensity - a.hotspot.intensity).slice(0, 5)
        : [...states].sort((a, b) => b.hotspot.intensity - a.hotspot.intensity).slice(0, 5);

    return (
        <main className={styles.dashboard}>
            {/* Floating Particles */}
            <div className="particlesContainer">
                {particles.map((p) => (
                    <span
                        key={p.id}
                        className="particle"
                        style={{
                            left: p.left,
                            top: p.top,
                            width: p.size,
                            height: p.size,
                            animationDuration: `${p.duration}s`,
                            animationDelay: `${p.delay}s`,
                        }}
                    />
                ))}
            </div>

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <motion.div
                        className={styles.logo}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <span className={styles.brandPrefix}>&gt;</span>
                        <span className={styles.brandText}>Cognexis</span>
                        <span className={styles.cursor}>_</span>
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
                        <h2 className={styles.cardTitle}>{stats.title}</h2>

                        {stats.loading ? (
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
                            // State Details in India View (When clicked but not drilled down - rare case with new logic but safe to keep)
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

                    {/* Top Hotspots */}
                    <motion.div
                        className={styles.hotspotsCard}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h3 className={styles.cardTitle}>
                            🔥 Top {viewMode === 'state' ? 'Districts' : 'Hotspots'}
                        </h3>

                        {stats.loading ? (
                            <div className={styles.loadingState}>Loading rankings...</div>
                        ) : (
                            <div className={styles.hotspotsList}>
                                {topItems.map((item: any, i) => (
                                    <motion.div
                                        key={item.state_id || item.district_id}
                                        className={styles.hotspotItem}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + (i * 0.1) }}
                                    >
                                        <span className={styles.hotspotRank}>{i + 1}</span>
                                        <span className={styles.hotspotName}>
                                            {item.name || item.district_name}
                                        </span>
                                        <span
                                            className={styles.hotspotIntensity}
                                            style={{
                                                color: (item.hotspot?.intensity || 0) > 0.66 ? 'var(--hotspot-high)' :
                                                    (item.hotspot?.intensity || 0) > 0.33 ? 'var(--hotspot-medium)' :
                                                        'var(--hotspot-low)'
                                            }}
                                        >
                                            {Math.round((item.hotspot?.intensity || 0) * 100)}%
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </aside>
            </div>
        </main>
    );
}
