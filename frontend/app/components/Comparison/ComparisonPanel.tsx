"use client";

import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LocationSelector, { LocationResult } from './LocationSelector';
import { SignalBreakdown } from '../Signals';
import { API_BASE, WS_BASE } from '../../lib/config';
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

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 500;

const ComparisonPanel = memo(function ComparisonPanel({
    isOpen,
    onClose,
}: ComparisonPanelProps) {
    const [location1, setLocation1] = useState<LocationResult | null>(null);
    const [location2, setLocation2] = useState<LocationResult | null>(null);
    const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // AbortController for request cancellation
    const abortControllerRef = useRef<AbortController | null>(null);

    // AI Recommendation state
    const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Fetch with retry logic
    const fetchWithRetry = useCallback(async (
        url: string,
        signal: AbortSignal,
        attempt: number = 0
    ): Promise<Response> => {
        try {
            const response = await fetch(url, { signal });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response;
        } catch (err) {
            if (signal.aborted) throw err;

            if (attempt < MAX_RETRIES - 1) {
                // Exponential backoff
                const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                setRetryCount(attempt + 1);
                return fetchWithRetry(url, signal, attempt + 1);
            }
            throw err;
        }
    }, []);

    // Fetch comparison data when both locations are selected
    useEffect(() => {
        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        if (!location1 || !location2) {
            setComparisonData(null);
            setError(null);
            return;
        }

        if (location1.id === location2.id) {
            setError('Please select two different locations to compare');
            setComparisonData(null);
            return;
        }

        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        const fetchComparison = async () => {
            setLoading(true);
            setError(null);
            setRetryCount(0);

            try {
                const url = `${API_BASE}/api/compare?loc1=${encodeURIComponent(location1.id)}&loc2=${encodeURIComponent(location2.id)}`;
                const response = await fetchWithRetry(url, signal);

                const data = await response.json();

                // Handle case where location not found in API
                if (!data.location1 && !data.location2) {
                    throw new Error('Neither location was found in the database');
                }

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
                if (signal.aborted) return;

                const message = err instanceof Error ? err.message : 'Unknown error';
                if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
                    setError('Network error. Please check your connection and try again.');
                } else {
                    setError(`Failed to load comparison: ${message}`);
                }
                setComparisonData(null);
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchComparison();

        return () => {
            abortControllerRef.current?.abort();
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [location1, location2, fetchWithRetry]);

    // Fetch AI Recommendation when comparison data is ready
    useEffect(() => {
        if (!comparisonData?.location1 || !comparisonData?.location2 || !location1 || !location2) {
            setAiRecommendation(null);
            return;
        }

        // Clean up previous WebSocket
        if (wsRef.current) {
            wsRef.current.close();
        }

        const fetchAIRecommendation = async () => {
            setAiLoading(true);
            setAiError(null);
            setAiRecommendation('');

            try {
                // Connect to WebSocket for streaming recommendation
                const wsUrl = `${WS_BASE}/ws/compare`;
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    // Send comparison context
                    ws.send(JSON.stringify({
                        type: 'compare_request',
                        location1: {
                            name: location1.name,
                            type: location1.type,
                            signals: comparisonData.location1!.signals,
                            hotspot: comparisonData.location1!.hotspot
                        },
                        location2: {
                            name: location2.name,
                            type: location2.type,
                            signals: comparisonData.location2!.signals,
                            hotspot: comparisonData.location2!.hotspot
                        }
                    }));
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'stream') {
                            setAiRecommendation(prev => (prev || '') + (data.content || ''));
                        } else if (data.type === 'stream_end') {
                            setAiLoading(false);
                            if (data.content) {
                                setAiRecommendation(data.content);
                            }
                        } else if (data.type === 'error') {
                            setAiError(data.message || 'Failed to generate recommendation');
                            setAiLoading(false);
                        }
                    } catch (e) {
                        console.error('Failed to parse WebSocket message:', e);
                    }
                };

                ws.onerror = () => {
                    // Fall back to HTTP endpoint
                    ws.close();
                    fetchHTTPRecommendation();
                };

                ws.onclose = () => {
                    // Cleanup
                    if (wsRef.current === ws) {
                        wsRef.current = null;
                    }
                };
            } catch {
                // Fall back to HTTP
                fetchHTTPRecommendation();
            }
        };

        const fetchHTTPRecommendation = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/compare/recommend`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        location1: {
                            name: location1!.name,
                            type: location1!.type,
                            signals: comparisonData!.location1!.signals,
                            hotspot: comparisonData!.location1!.hotspot
                        },
                        location2: {
                            name: location2!.name,
                            type: location2!.type,
                            signals: comparisonData!.location2!.signals,
                            hotspot: comparisonData!.location2!.hotspot
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    setAiRecommendation(data.recommendation || 'No recommendation available.');
                } else {
                    // Use fallback rule-based recommendation
                    generateFallbackRecommendation();
                }
            } catch {
                generateFallbackRecommendation();
            } finally {
                setAiLoading(false);
            }
        };

        const generateFallbackRecommendation = () => {
            const signals1 = comparisonData!.location1!.signals;
            const signals2 = comparisonData!.location2!.signals;
            const avg1 = (signals1.growth + signals1.flow + signals1.labor) / 3;
            const avg2 = (signals2.growth + signals2.flow + signals2.labor) / 3;
            const loc1Higher = avg1 > avg2;
            const higherLoc = loc1Higher ? location1!.name : location2!.name;
            const lowerLoc = loc1Higher ? location2!.name : location1!.name;
            const totalDiff = Math.abs(signals1.growth - signals2.growth) +
                Math.abs(signals1.flow - signals2.flow) +
                Math.abs(signals1.labor - signals2.labor);

            if (totalDiff < 0.5) {
                setAiRecommendation(`Both locations show similar demand patterns. Maintain current resource allocation.`);
            } else if (totalDiff < 1.5) {
                setAiRecommendation(`${higherLoc} shows moderately higher demand. Consider mobile camp deployment during peak hours.`);
            } else {
                setAiRecommendation(`PRIORITY: ${higherLoc}. Deploy additional permanent centres and extend operating hours. ${lowerLoc} can share resources.`);
            }
        };

        fetchAIRecommendation();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [comparisonData, location1, location2]);

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

                            <div className={styles.selectorControls}>
                                <div className={styles.vsIndicator}>VS</div>
                            </div>

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
                                                tooltipPosition="right"
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
                                                tooltipPosition="left"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* AI-Powered Terminal Recommendation */}
                                {comparisonData.location1 && comparisonData.location2 && (
                                    <div className={styles.terminalSection}>
                                        <div className={styles.terminalHeader}>
                                            <span className={styles.terminalDot} />
                                            <span className={styles.terminalDot} />
                                            <span className={styles.terminalDot} />
                                            <span className={styles.terminalTitle}>CHRONOS ANALYSIS</span>
                                        </div>
                                        <div className={styles.terminalBody}>
                                            <div className={styles.terminalLine}>
                                                <span className={styles.terminalPrefix}>▸</span>
                                                <span>COMPARATIVE ANALYSIS: {location1?.name} vs {location2?.name}</span>
                                            </div>
                                            <div className={styles.terminalLine}>
                                                <span className={styles.terminalPrefix}>▸</span>
                                                <span>═══════════════════════════════════════</span>
                                            </div>

                                            {aiLoading && (
                                                <div className={styles.terminalLine}>
                                                    <span className={styles.terminalPrefix}>▸</span>
                                                    <span>GENERATING RECOMMENDATION</span>
                                                    <span className={styles.terminalCursor}>█</span>
                                                </div>
                                            )}

                                            {aiError && (
                                                <div className={styles.terminalLine}>
                                                    <span className={styles.terminalPrefix}>!</span>
                                                    <span className={styles.terminalError}>{aiError}</span>
                                                </div>
                                            )}

                                            {aiRecommendation && (
                                                <motion.div
                                                    className={styles.terminalRecommendation}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                >
                                                    <div className={styles.terminalLine}>
                                                        <span className={styles.terminalPrefix}>▸</span>
                                                        <span className={styles.terminalLabel}>RECOMMENDATION:</span>
                                                    </div>
                                                    <div className={styles.terminalContent}>
                                                        {aiRecommendation}
                                                        {aiLoading && <span className={styles.terminalCursor}>█</span>}
                                                    </div>
                                                </motion.div>
                                            )}

                                            {!aiLoading && !aiError && !aiRecommendation && (
                                                <div className={styles.terminalLine}>
                                                    <span className={styles.terminalPrefix}>▸</span>
                                                    <span>AWAITING ANALYSIS...</span>
                                                </div>
                                            )}
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
