"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import IndiaMap from "./components/Map/IndiaMap";
import DashboardStats from "./components/Dashboard/DashboardStats";
import DashboardHotspots from "./components/Dashboard/DashboardHotspots";
import DashboardBreadcrumb from "./components/Dashboard/DashboardBreadcrumb";
import Timeline from "./components/Timeline/Timeline";
import { useMapStore } from "./stores/mapStore";
import Chatbot from "./components/Chatbot/Chatbot";
import { ComparisonPanel } from "./components/Comparison";
import styles from "./dashboard.module.css";

interface Particle {
    id: number;
    left: string;
    top: string;
    size: number;
    duration: number;
    delay: number;
}

export default function Dashboard() {
    const {
        selectedState,
        selectedMonth,
        states,
        viewMode,
        selectedStateName,
        districts,
        loadingDistricts,
        selectedDistrict,
        drillIntoState,
        setSelectedDistrict
    } = useMapStore();

    // Detect if viewing forecast month (Jan 2026+)
    const isForecastMonth = selectedMonth > "2025-12";

    // Comparison mode state
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);

    // Generate particles only on client side to avoid hydration mismatch
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        setParticles(Array.from({ length: 20 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            size: Math.random() * 2.5 + 1.5,
            duration: Math.random() * 20 + 20,
            delay: Math.random() * 10,
        })));
    }, []);

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
                items: [],
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
            .slice(0, 15);
    }, [viewMode, districts, states]);

    // Toggle comparison panel
    const handleCompareToggle = useCallback(() => {
        setIsComparisonOpen(prev => !prev);
    }, []);

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
                    <Link href="/" className={styles.logo}>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{ display: 'flex', alignItems: 'center' }}
                        >
                            <span className={styles.brandPrefix}>&gt;</span>
                            <span className={styles.brandText}>Chronos-X</span>
                            <span className={styles.cursor}>_</span>
                        </motion.div>
                    </Link>

                    {/* Forecast Badge OR Breadcrumb */}
                    {isForecastMonth ? (
                        <div className={styles.forecastBadge}>
                            Forecasted via Amazon Chronos + Spatial ML
                        </div>
                    ) : (
                        <DashboardBreadcrumb />
                    )}

                    <div className={styles.headerActions}>
                        {/* Compare Button */}
                        <motion.button
                            className={styles.compareButton}
                            onClick={handleCompareToggle}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span>Compare</span>
                        </motion.button>

                        <div className={`${styles.monthBadge} ${isForecastMonth ? styles.forecastMonthBadge : ''}`}>
                            <span className={styles.monthLabel}>Viewing</span>
                            <span className={styles.monthValue}>{selectedMonth}</span>
                        </div>
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
                        <Timeline />
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
                        onItemClick={(item) => {
                            if (viewMode === 'india' && item.state_id && item.name) {
                                drillIntoState(item.state_id, item.name);
                            } else if (item.district_name) {
                                setSelectedDistrict(item.district_name);
                            }
                        }}
                    />
                </aside>
            </div>

            {/* Comparison Panel */}
            <ComparisonPanel
                isOpen={isComparisonOpen}
                onClose={() => setIsComparisonOpen(false)}
            />

            {/* Chatbot */}
            <Chatbot />
        </main>
    );
}
