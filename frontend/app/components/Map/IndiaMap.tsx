"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3-geo';
import { useMapStore } from '../../stores/mapStore';
import { useMapData, getStateIdFromGeoJSON } from '../../hooks/useMapData';
import MapTooltip from './MapTooltip';
import styles from './IndiaMap.module.css';

interface GeoFeature {
    type: string;
    properties: {
        ST_NM?: string;
        NAME_1?: string;
        name?: string;
        [key: string]: any;
    };
    geometry: any;
}

interface GeoJSON {
    type: string;
    features: GeoFeature[];
}

// Color scale for hotspot intensity
function getIntensityColor(intensity: number): string {
    if (intensity < 0.33) return 'var(--hotspot-low)';
    if (intensity < 0.66) return 'var(--hotspot-medium)';
    return 'var(--hotspot-high)';
}

function getIntensityOpacity(intensity: number): number {
    return 0.4 + (intensity * 0.4); // 0.4 to 0.8
}

// Memoized state path component for performance
interface StatePathProps {
    feature: GeoFeature;
    pathD: string;
    stateId: string | undefined;
    intensity: number;
    isHovered: boolean;
    isSelected: boolean;
    hasData: boolean;
    onMouseEnter: (e: React.MouseEvent, feature: GeoFeature) => void;
    onMouseLeave: () => void;
    onClick: () => void;
}

const StatePath = memo(function StatePath({
    pathD,
    intensity,
    isHovered,
    isSelected,
    hasData,
    onMouseEnter,
    onMouseLeave,
    onClick,
    feature
}: StatePathProps) {
    const handleMouseEnter = useCallback((e: React.MouseEvent) => {
        onMouseEnter(e, feature);
    }, [onMouseEnter, feature]);

    return (
        <path
            d={pathD}
            className={`${styles.statePath} ${isHovered ? styles.hovered : ''} ${isSelected ? styles.selected : ''}`}
            style={{
                fill: hasData ? getIntensityColor(intensity) : 'var(--bg-muted)',
                fillOpacity: hasData ? getIntensityOpacity(intensity) : 0.3,
                stroke: isSelected ? 'var(--brand-primary)' : isHovered ? 'var(--brand-primary)' : 'var(--border-on-dark)',
                strokeWidth: isSelected ? 2 : isHovered ? 1.5 : 0.5,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
        />
    );
});

export default function IndiaMap() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [geoData, setGeoData] = useState<GeoJSON | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [tooltipData, setTooltipData] = useState<{
        x: number;
        y: number;
        state: any;
    } | null>(null);

    const {
        hoveredState,
        setHoveredState,
        selectedState,
        setSelectedState,
        states,
        loading,
        error
    } = useMapStore();

    // Fetch map data from API
    useMapData();

    // Load GeoJSON - use the new smaller, more accurate file
    useEffect(() => {
        fetch('/india-new.geojson')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => setGeoData(data))
            .catch(err => {
                console.error('Failed to load GeoJSON:', err);
                setGeoError('Failed to load map data. Please refresh the page.');
            });
    }, []);

    // Get state name from GeoJSON feature
    const getStateName = useCallback((feature: GeoFeature): string => {
        return feature.properties.ST_NM || feature.properties.NAME_1 || feature.properties.name || '';
    }, []);

    // Get state data by GeoJSON name
    const getStateData = useCallback((geoName: string) => {
        const stateId = getStateIdFromGeoJSON(geoName);
        if (!stateId) return null;
        return states.find(s => s.state_id === stateId);
    }, [states]);

    // D3 projection for India - scaled up to fill space
    const projection = d3.geoMercator()
        .center([82, 23]) // Centered on India
        .scale(1350)
        .translate([350, 380]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Handle mouse events
    const handleMouseEnter = useCallback((e: React.MouseEvent, feature: GeoFeature) => {
        const name = getStateName(feature);
        const stateData = getStateData(name);
        const stateId = getStateIdFromGeoJSON(name);

        if (stateId) {
            setHoveredState(stateId);

            // Calculate position relative to viewport
            let x = e.clientX + 15;
            let y = e.clientY + 15;

            // Prevent tooltip from going off-screen
            if (x > window.innerWidth - 220) {
                x = e.clientX - 220;
            }
            if (y > window.innerHeight - 150) {
                y = e.clientY - 150;
            }

            setTooltipData({
                x,
                y,
                state: stateData || { name, state_id: stateId }
            });
        }
    }, [getStateName, getStateData, setHoveredState]);

    const handleMouseLeave = useCallback(() => {
        setHoveredState(null);
        setTooltipData(null);
    }, [setHoveredState]);

    const handleClick = useCallback((stateId: string | undefined) => {
        if (stateId) {
            setSelectedState(selectedState === stateId ? null : stateId);
        }
    }, [selectedState, setSelectedState]);

    // Show error state
    if (geoError || error) {
        return (
            <div className={styles.mapError}>
                <span>⚠️</span>
                <span>{geoError || error}</span>
            </div>
        );
    }

    // Show loading state
    if (!geoData || loading) {
        return (
            <div className={styles.mapLoading}>
                <div className={styles.loadingPulse}></div>
                <span>{!geoData ? 'Loading Map...' : 'Loading Data...'}</span>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={styles.mapContainer}>
            <svg
                viewBox="0 0 700 780"
                className={styles.mapSvg}
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Definitions for effects */}
                <defs>
                    <radialGradient id="hotspotGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="var(--hotspot-high)" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="var(--hotspot-high)" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* State paths - using memoized component */}
                <g className={styles.statesGroup}>
                    {geoData.features.map((feature, i) => {
                        const name = getStateName(feature);
                        const stateId = getStateIdFromGeoJSON(name);
                        const stateData = getStateData(name);
                        const intensity = stateData?.hotspot?.intensity || 0;
                        const isHovered = stateId ? hoveredState === stateId : false;
                        const isSelected = stateId ? selectedState === stateId : false;
                        const pathD = pathGenerator(feature as any) || '';

                        return (
                            <StatePath
                                key={`state-${stateId || name}-${i}`}
                                feature={feature}
                                pathD={pathD}
                                stateId={stateId}
                                intensity={intensity}
                                isHovered={isHovered}
                                isSelected={isSelected}
                                hasData={!!stateData}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                                onClick={() => handleClick(stateId)}
                            />
                        );
                    })}
                </g>

                {/* Hotspot indicators - simple static dots for high intensity states */}
                <g className={styles.hotspotsGroup}>
                    {states.filter(s => s.hotspot.intensity > 0.6).map((state) => {
                        const feature = geoData.features.find(f => {
                            const name = getStateName(f);
                            return getStateIdFromGeoJSON(name) === state.state_id;
                        });

                        if (!feature) return null;

                        const centroid = pathGenerator.centroid(feature as any);
                        if (!centroid || isNaN(centroid[0])) return null;

                        const color = getIntensityColor(state.hotspot.intensity);

                        return (
                            <circle
                                key={`hotspot-${state.state_id}`}
                                cx={centroid[0]}
                                cy={centroid[1]}
                                r={7}
                                fill={color}
                                fillOpacity={0.9}
                                stroke="white"
                                strokeWidth={2}
                            />
                        );
                    })}
                </g>
            </svg>

            {/* Tooltip */}
            <AnimatePresence mode="wait">
                {tooltipData && (
                    <MapTooltip
                        x={tooltipData.x}
                        y={tooltipData.y}
                        data={tooltipData.state}
                    />
                )}
            </AnimatePresence>

            {/* Map Legend */}
            <div className={styles.legend}>
                <h4>Demand Intensity</h4>
                <div className={styles.legendItems}>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: 'var(--hotspot-low)' }} />
                        <span>Low</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: 'var(--hotspot-medium)' }} />
                        <span>Medium</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: 'var(--hotspot-high)' }} />
                        <span>High</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
