"use client";

import React, { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LocationSelector, { LocationResult } from './LocationSelector';
import { SignalBreakdown } from '../Signals';
import styles from './ComparisonPanel.module.css';

interface ComparisonData {
    location1: {
        id: string;
        name: string;
        type: string;
        signals: { growth: number; flow: number; labor: number };
        hotspot?: { intensity: number };
    } | null;
    location2: {
        id: string;
        name: string;
        type: string;
        signals: { growth: number; flow: number; labor: number };
        hotspot?: { intensity: number };
    } | null;
}

export interface ComparisonPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ComparisonPanel = memo(function ComparisonPanel({
    isOpen,
    onClose,
}: ComparisonPanelProps) {
    const [location1, setLocation1] = useState<LocationResult | null>(null);
    const [location2, setLocation2] = useState<LocationResult | null>(null);
    const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch comparison data when both locations are selected
    useEffect(() => {
        if (!location1 || !location2) {
            setComparisonData(null);
            return;
        }

        if (location1.id === location2.id) {
            setError('Please select two different locations');
            setComparisonData(null);
            return;
        }

        const fetchComparison = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `${API_BASE}/api/compare?loc1=${encodeURIComponent(location1.id)}&loc2=${encodeURIComponent(location2.id)}`
                );

                if (!response.ok) {
                    throw new Error('Comparison failed');
                }

                const data = await response.json();
                setComparisonData({
                    location1: data.location1 ? {
                        id: location1.id,
                        name: location1.name,
                        type: location1.type,
                        signals: data.location1.signals,
                        hotspot: data.location1.hotspot,
                    } : null,
                    location2: data.location2 ? {
                        id: location2.id,
                        name: location2.name,
                        type: location2.type,
                        signals: data.location2.signals,
                        hotspot: data.location2.hotspot,
                    } : null,
                });
            } catch (err) {
                setError('Failed to load comparison data');
                setComparisonData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchComparison();
    }, [location1, location2]);

    // Calculate difference between two values
    const getDifference = useCallback((val1: number, val2: number) => {
        const diff = val1 - val2;
        const percentage = val2 !== 0 ? ((diff / val2) * 100).toFixed(1) : '∞';
        return {
            value: diff,
            percentage,
            isPositive: diff > 0,
            isNegative: diff < 0,
        };
    }, []);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        className={styles.panel}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    >
                        {/* Header */}
                        <div className={styles.header}>
                            <h2 className={styles.title}>Compare Regions</h2>
                            <button
                                className={styles.closeButton}
                                onClick={onClose}
                                type="button"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        {/* Selectors */}
                        <div className={styles.selectors}>
                            <LocationSelector
                                value={location1}
                                onChange={setLocation1}
                                label="Location 1"
                                placeholder="Select first location..."
                                excludeId={location2?.id}
                            />

                            <div className={styles.vsIndicator}>VS</div>

                            <LocationSelector
                                value={location2}
                                onChange={setLocation2}
                                label="Location 2"
                                placeholder="Select second location..."
                                excludeId={location1?.id}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className={styles.error}>{error}</div>
                        )}

                        {/* Loading */}
                        {loading && (
                            <div className={styles.loading}>
                                <span className={styles.spinner} />
                                Loading comparison...
                            </div>
                        )}

                        {/* Comparison Results */}
                        {comparisonData && !loading && (
                            <div className={styles.comparison}>
                                {/* Side by Side Cards */}
                                <div className={styles.comparisonGrid}>
                                    {/* Location 1 */}
                                    <div className={styles.locationCard}>
                                        <div className={styles.locationHeader}>
                                            <span className={`${styles.locationBadge} ${styles[`badge${location1?.type}`]}`}>
                                                {location1?.type}
                                            </span>
                                            <h3 className={styles.locationName}>{location1?.name}</h3>
                                        </div>
                                        {comparisonData.location1 && (
                                            <SignalBreakdown
                                                signals={comparisonData.location1.signals}
                                                compact
                                            />
                                        )}
                                    </div>

                                    {/* Location 2 */}
                                    <div className={styles.locationCard}>
                                        <div className={styles.locationHeader}>
                                            <span className={`${styles.locationBadge} ${styles[`badge${location2?.type}`]}`}>
                                                {location2?.type}
                                            </span>
                                            <h3 className={styles.locationName}>{location2?.name}</h3>
                                        </div>
                                        {comparisonData.location2 && (
                                            <SignalBreakdown
                                                signals={comparisonData.location2.signals}
                                                compact
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Difference Analysis */}
                                {comparisonData.location1 && comparisonData.location2 && (
                                    <div className={styles.differenceSection}>
                                        <h4 className={styles.differenceTitle}>Difference Analysis</h4>
                                        <div className={styles.differenceGrid}>
                                            {(['growth', 'flow', 'labor'] as const).map((signal) => {
                                                const diff = getDifference(
                                                    comparisonData.location1!.signals[signal],
                                                    comparisonData.location2!.signals[signal]
                                                );
                                                return (
                                                    <div key={signal} className={styles.differenceItem}>
                                                        <span className={styles.differenceLabel}>
                                                            {signal.charAt(0).toUpperCase() + signal.slice(1)}
                                                        </span>
                                                        <span className={`${styles.differenceValue} ${diff.isPositive ? styles.positive :
                                                                diff.isNegative ? styles.negative : ''
                                                            }`}>
                                                            {diff.isPositive ? '+' : ''}{diff.value.toFixed(2)}
                                                            <span className={styles.differencePercent}>
                                                                ({diff.isPositive ? '+' : ''}{diff.percentage}%)
                                                            </span>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Empty State */}
                        {!location1 && !location2 && !loading && (
                            <div className={styles.emptyState}>
                                <span className={styles.emptyIcon}>🔍</span>
                                <p>Select two locations to compare their signals</p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

export default ComparisonPanel;
