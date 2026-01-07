"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import IndiaMap from "./components/Map/IndiaMap";
import DashboardStats from "./components/Dashboard/DashboardStats";
import DashboardHotspots from "./components/Dashboard/DashboardHotspots";
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
    const selectedStateData = useMemo(() =>
        states.find(s => s.state_id === selectedState),
        [states, selectedState]);

    // Get currently selected district object if any
    const selectedDistrictData = useMemo(() =>
        districts.find(d => d.district_name === selectedDistrict),
        [districts, selectedDistrict]);

    // Calculate aggregated stats for the current view
    const stats = useMemo(() => {
        if (selectedDistrictData) {
            return {
                title: selectedDistrictData.district_name,
                countLabel: 'PIN Codes',
                count: selectedDistrictData.pin_count,
                items: [], // No sub-items for district
                loading: false
            };
        }

        if (viewMode === 'state') {
            return {
                title: `${selectedStateName} Overview`,
                countLabel: 'Districts',
                count: districts.length,
                items: districts,
                loading: loadingDistricts
            };
        }

        return {
            title: 'India Overview',
            countLabel: 'States',
            count: states.length,
            items: states,
            loading: false
        };
    }, [selectedDistrictData, viewMode, selectedStateName, districts, loadingDistricts, states]);

    // Calculate top items for hotspots list
    const topItems = useMemo(() => {
        const sourceData = viewMode === 'state' ? districts : states;
        return [...sourceData]
            .sort((a, b) => (b.hotspot?.intensity || 0) - (a.hotspot?.intensity || 0))
            .slice(0, 5);
    }, [viewMode, districts, states]);

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
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <IndiaMap />
                    </motion.div>
                </section>

                {/* Right Panel - Details */}
                <aside className={styles.sidebar}>
                    {/* Stats Overview */}
                    <DashboardStats
                        title={stats.title}
                        loading={stats.loading}
                        viewMode={viewMode}
                        selectedDistrictData={selectedDistrictData}
                        selectedStateData={selectedStateData}
                        stats={stats}
                    />

                    {/* Top Hotspots */}
                    <DashboardHotspots
                        title={`Top ${viewMode === 'state' ? 'Districts' : 'Hotspots'}`}
                        loading={stats.loading}
                        items={topItems}
                    />
                </aside>
            </div>
        </main>
    );
}
