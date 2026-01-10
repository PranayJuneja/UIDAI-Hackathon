"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../../stores/mapStore';
import styles from './Timeline.module.css';

// SVG Icons
const PlayIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M8 5v14l11-7z" />
    </svg>
);

const PauseIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);

const PrevIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);

const NextIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

export default function Timeline() {
    const {
        selectedMonth,
        setSelectedMonth,
        isPlaying,
        togglePlayback,
        playbackSpeed,
        terminalInfo
    } = useMapStore();

    // Generate months from Nov 2025 to Jun 2026 (8 months: 2 historical + 6 forecast)
    const months = useMemo(() => {
        const result = [];
        const startDate = new Date(2025, 10, 1); // Nov 2025 (Month is 0-indexed)

        for (let i = 0; i < 8; i++) {
            const d = new Date(startDate);
            d.setMonth(startDate.getMonth() + i);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const label = d.toLocaleString('default', { month: 'short' });
            const monthValue = `${year}-${month}`;

            result.push({
                value: monthValue,
                label: label,
                year: year.toString(),
                isYearStart: d.getMonth() === 0,
                isForecast: monthValue > "2025-12"  // Jan 2026+ is forecast
            });
        }
        return result;
    }, []);

    const currentIndex = months.findIndex(m => m.value === selectedMonth);
    const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-playback logic
    useEffect(() => {
        if (isPlaying) {
            playbackTimeoutRef.current = setTimeout(() => {
                const nextIndex = (currentIndex + 1) % months.length;
                setSelectedMonth(months[nextIndex].value);

                // Optional: Stop at the end instead of looping
                if (nextIndex === 0) {
                    togglePlayback(); // Stop playback when looping back
                }
            }, playbackSpeed);
        }

        return () => {
            if (playbackTimeoutRef.current) {
                clearTimeout(playbackTimeoutRef.current);
            }
        };
    }, [isPlaying, currentIndex, months, playbackSpeed, setSelectedMonth, togglePlayback]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value);
        if (index >= 0 && index < months.length) {
            setSelectedMonth(months[index].value);
        }
    };

    const handlePrev = () => {
        const nextIndex = currentIndex - 1;
        if (nextIndex >= 0) {
            setSelectedMonth(months[nextIndex].value);
        }
    };

    const handleNext = () => {
        const nextIndex = currentIndex + 1;
        if (nextIndex < months.length) {
            setSelectedMonth(months[nextIndex].value);
        }
    };

    const handleMonthClick = (value: string) => {
        setSelectedMonth(value);
    };

    // Calculate progress percentage for track fill
    const progress = (currentIndex / (months.length - 1)) * 100;

    // Detect if current month is a forecast month
    const isForecastMonth = selectedMonth > "2025-12";

    // Hide timeline when terminal is open (to prevent overlap)
    const isVisible = !terminalInfo.visible;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={styles.timelineContainer}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                    {/* Playback Controls */}
                    <div className={styles.controls}>
                        <button
                            className={styles.navButton}
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            aria-label="Previous Month"
                        >
                            <PrevIcon />
                        </button>

                        <button
                            className={styles.playButton}
                            onClick={togglePlayback}
                            aria-label={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>

                        <button
                            className={styles.navButton}
                            onClick={handleNext}
                            disabled={currentIndex === months.length - 1}
                            aria-label="Next Month"
                        >
                            <NextIcon />
                        </button>
                    </div>

                    {/* Slider */}
                    <div className={styles.sliderArea}>
                        <div className={styles.sliderTrack}>
                            <div
                                className={`${styles.trackFill} ${isForecastMonth ? styles.forecastTrack : ''}`}
                                style={{ width: `${progress}%` }}
                            />
                            <input
                                type="range"
                                min="0"
                                max={months.length - 1}
                                value={currentIndex === -1 ? 0 : currentIndex}
                                onChange={handleSliderChange}
                                className={styles.rangeInput}
                            />
                        </div>

                        {/* Month Indicators */}
                        <div className={styles.markers}>
                            {months.map((m, i) => (
                                <div
                                    key={m.value}
                                    className={`${styles.marker} ${m.value === selectedMonth ? styles.active : ''} ${m.isForecast ? styles.forecast : ''}`}
                                    onClick={() => handleMonthClick(m.value)}
                                >
                                    <div className={styles.markerDot} />
                                    <span className={styles.markerLabel}>
                                        {m.label}
                                        {m.isYearStart && <span style={{ fontSize: '9px', display: 'block', opacity: 0.7 }}>{m.year}</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
