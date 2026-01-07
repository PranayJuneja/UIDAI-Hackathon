"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3-geo';
import { useMapStore, GeoFeature, GeoJSON, DistrictData } from '../../stores/mapStore';
import { useMapData, getStateIdFromGeoJSON, STATE_ID_TO_GEOJSON } from '../../hooks/useMapData';
import { useDistrictData } from '../../hooks/useDistrictData';
import MapTooltip from './MapTooltip';
import styles from './IndiaMap.module.css';

// Traffic-light style color palette for clear intensity distinction
// Blue (Low ≤50%) → Green (Medium 50-55%) → Red (High >55%)
function getIntensityColor(intensity: number): string {
    if (intensity <= 0.50) return '#3B82F6';  // Blue - Low (≤50%)
    if (intensity <= 0.55) return '#22C55E';  // Green - Medium (50-55%)
    return '#EF4444';  // Red - High (>55%)
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

    // Use solid color for states with data, gray for no data
    const fill = hasData ? getIntensityColor(intensity) : '#374151';
    const strokeColor = isSelected
        ? '#3B82F6'
        : isHovered
            ? '#60A5FA'
            : 'rgba(255, 255, 255, 0.2)';

    return (
        <path
            d={pathD}
            className={`${styles.statePath} ${isHovered ? styles.hovered : ''} ${isSelected ? styles.selected : ''}`}
            style={{
                fill: fill,
                fillOpacity: hasData ? 0.85 : 0.4,
                stroke: strokeColor,
                strokeWidth: isSelected ? 2.5 : isHovered ? 2 : 0.75,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
        />
    );
});

// Memoized district path component
interface DistrictPathProps {
    feature: GeoFeature;
    pathD: string;
    districtName: string;
    districtData: DistrictData | undefined;
    isHovered: boolean;
    isSelected: boolean;
    centroid: [number, number] | null;
    onMouseEnter: (e: React.MouseEvent, feature: GeoFeature, districtName: string) => void;
    onMouseLeave: () => void;
    onClick: () => void;
}

const DistrictPath = memo(function DistrictPath({
    pathD,
    districtName,
    districtData,
    isHovered,
    isSelected,
    centroid,
    onMouseEnter,
    onMouseLeave,
    onClick,
    feature
}: DistrictPathProps) {
    const handleMouseEnter = useCallback((e: React.MouseEvent) => {
        onMouseEnter(e, feature, districtName);
    }, [onMouseEnter, feature, districtName]);

    const intensity = districtData?.hotspot?.intensity || 0;
    const hasData = !!districtData;
    const fill = hasData ? getIntensityColor(intensity) : '#374151';
    const strokeColor = isSelected
        ? '#3B82F6'
        : isHovered
            ? '#60A5FA'
            : 'rgba(255, 255, 255, 0.3)';

    return (
        <g
            className={styles.districtGroup}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick} // Added onClick
        >
            <path
                d={pathD}
                className={`${styles.districtPath} ${isHovered ? styles.hovered : ''} ${isSelected ? styles.selected : ''}`}
                style={{
                    fill: fill,
                    fillOpacity: hasData ? 0.85 : 0.4,
                    stroke: strokeColor,
                    strokeWidth: isSelected ? 2 : isHovered ? 1.5 : 0.5,
                }}
            />
            {centroid && (
                <text
                    x={centroid[0]}
                    y={centroid[1]}
                    className={`${styles.districtLabel} ${isHovered || isSelected ? styles.hovered : ''}`}
                >
                    {districtName}
                </text>
            )}
        </g>
    );
});

// Back Arrow Icon
const BackArrowIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
    </svg>
);

export default function IndiaMap() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [geoData, setGeoData] = useState<GeoJSON | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [tooltipData, setTooltipData] = useState<{
        x: number;
        y: number;
        state?: any;
        district?: any;
    } | null>(null);

    const {
        hoveredState,
        setHoveredState,
        hoveredDistrict,
        setHoveredDistrict,
        selectedState,
        setSelectedState,
        states,
        loading,
        error,
        viewMode,
        selectedStateForDrilldown,
        selectedStateName,
        drillIntoState,
        drillBackToIndia,
        loadingDistricts,
        selectedDistrict,
        setSelectedDistrict,
    } = useMapStore();

    // Fetch map data from API
    useMapData();

    // Fetch district data when in state view
    const { districts, districtGeoData, getDistrictName, getDistrictData } = useDistrictData();

    // Load India GeoJSON
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

    // Handle keyboard escape for back navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && viewMode === 'state') {
                drillBackToIndia();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, drillBackToIndia]);

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

    // D3 projection for India - adjusted to include northeast states fully
    const indiaProjection = d3.geoMercator()
        .center([82.5, 23])
        .scale(1250)
        .translate([400, 380]);

    const indiaPathGenerator = d3.geoPath().projection(indiaProjection);

    // Dynamic projection for district view - using auto-fit
    const getDistrictProjection = useCallback(() => {
        if (!districtGeoData) return null;

        const projection = d3.geoMercator();

        // Use fitSize to automatically calculate scale and translate
        // to fit the GeoJSON into the 800x780 viewport with 50px padding
        projection.fitExtent(
            [[50, 50], [750, 730]],
            districtGeoData as any
        );

        return projection;
    }, [districtGeoData]);

    // Handle state mouse events
    const handleStateMouseEnter = useCallback((e: React.MouseEvent, feature: GeoFeature) => {
        const name = getStateName(feature);
        const stateData = getStateData(name);
        const stateId = getStateIdFromGeoJSON(name);

        if (stateId) {
            setHoveredState(stateId);

            let x = e.clientX + 15;
            let y = e.clientY + 15;

            if (x > window.innerWidth - 220) x = e.clientX - 220;
            if (y > window.innerHeight - 150) y = e.clientY - 150;

            setTooltipData({
                x,
                y,
                state: stateData || { name, state_id: stateId }
            });
        }
    }, [getStateName, getStateData, setHoveredState]);

    const handleStateMouseLeave = useCallback(() => {
        setHoveredState(null);
        setTooltipData(null);
    }, [setHoveredState]);

    // Handle state click for drill-down
    const handleStateClick = useCallback((stateId: string | undefined, stateName: string) => {
        if (stateId && stateName) {
            // Clear tooltip and hovered state
            setTooltipData(null);
            setHoveredState(null);
            // Drill into the state
            drillIntoState(stateId, stateName);
        }
    }, [drillIntoState, setHoveredState]);

    // Handle district mouse events
    const handleDistrictMouseEnter = useCallback((e: React.MouseEvent, feature: GeoFeature, districtName: string) => {
        setHoveredDistrict(districtName);

        const districtData = getDistrictData(districtName);

        let x = e.clientX + 15;
        let y = e.clientY + 15;

        if (x > window.innerWidth - 220) x = e.clientX - 220;
        if (y > window.innerHeight - 150) y = e.clientY - 150;

        setTooltipData({
            x,
            y,
            district: districtData || {
                district_name: districtName,
                state_name: selectedStateName
            }
        });
    }, [getDistrictData, selectedStateName, setHoveredDistrict]);

    const handleDistrictMouseLeave = useCallback(() => {
        setHoveredDistrict(null);
        setTooltipData(null);
    }, [setHoveredDistrict]);

    // Handle district click
    const handleDistrictClick = useCallback((districtName: string) => {
        if (selectedDistrict === districtName) {
            setSelectedDistrict(null); // Deselect if already selected
        } else {
            setSelectedDistrict(districtName);
        }
    }, [selectedDistrict, setSelectedDistrict]);

    // Handle back button click
    const handleBackClick = useCallback(() => {
        setTooltipData(null);
        drillBackToIndia();
    }, [drillBackToIndia]);

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

    // Get district projection for state view
    const districtProjection = getDistrictProjection();
    const districtPathGenerator = districtProjection ? d3.geoPath().projection(districtProjection) : null;

    return (
        <div ref={containerRef} className={styles.mapContainer}>
            {/* Back Button - Show when in state view */}
            <AnimatePresence>
                {viewMode === 'state' && (
                    <motion.button
                        className={styles.backButton}
                        onClick={handleBackClick}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <BackArrowIcon />
                        <span>Back to India</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Breadcrumb Navigation */}
            <div className={styles.breadcrumb}>
                <span
                    className={`${styles.breadcrumbItem} ${viewMode === 'india' ? styles.active : styles.clickable}`}
                    onClick={viewMode === 'state' ? handleBackClick : undefined}
                >
                    🇮🇳 India
                </span>
                {viewMode === 'state' && selectedStateName && (
                    <>
                        <span className={styles.breadcrumbSeparator}>›</span>
                        <span className={`${styles.breadcrumbItem} ${styles.active}`}>
                            {selectedStateName}
                        </span>
                    </>
                )}
            </div>

            {/* Loading Overlay for Districts */}
            <AnimatePresence>
                {loadingDistricts && (
                    <motion.div
                        className={styles.loadingOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className={styles.loadingPulse}></div>
                        <span>Loading districts...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* India View */}
            <AnimatePresence mode="wait">
                {viewMode === 'india' && (
                    <motion.svg
                        key="india-map"
                        viewBox="0 0 800 780"
                        className={styles.mapSvg}
                        preserveAspectRatio="xMidYMid meet"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    >
                        {/* SVG Definitions */}
                        <defs>
                            {/* Blue/Green/Red intensity gradients */}
                            <linearGradient id="gradientLow" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2563EB" stopOpacity="1" />
                                <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.95" />
                                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.9" />
                            </linearGradient>
                            <linearGradient id="gradientMedium" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#16A34A" stopOpacity="1" />
                                <stop offset="50%" stopColor="#22C55E" stopOpacity="0.95" />
                                <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.9" />
                            </linearGradient>
                            <linearGradient id="gradientHigh" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#DC2626" stopOpacity="1" />
                                <stop offset="50%" stopColor="#EF4444" stopOpacity="0.95" />
                                <stop offset="100%" stopColor="#F87171" stopOpacity="0.9" />
                            </linearGradient>

                            {/* Glow filter for hover/selected states */}
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* State paths */}
                        <g className={styles.statesGroup}>
                            {geoData.features.map((feature, i) => {
                                const name = getStateName(feature);
                                const stateId = getStateIdFromGeoJSON(name);
                                const stateData = getStateData(name);
                                const intensity = stateData?.hotspot?.intensity || 0;
                                const isHovered = stateId ? hoveredState === stateId : false;
                                const isSelected = stateId ? selectedState === stateId : false;
                                const pathD = indiaPathGenerator(feature as any) || '';

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
                                        onMouseEnter={handleStateMouseEnter}
                                        onMouseLeave={handleStateMouseLeave}
                                        onClick={() => handleStateClick(stateId, name)}
                                    />
                                );
                            })}
                        </g>
                    </motion.svg>
                )}

                {/* State/District View */}
                {viewMode === 'state' && districtGeoData && districtPathGenerator && (
                    <motion.svg
                        key="district-map"
                        viewBox="0 0 800 780"
                        className={styles.mapSvg}
                        preserveAspectRatio="xMidYMid meet"
                        initial={{ opacity: 0, scale: 1.2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    >
                        {/* SVG Definitions (same as above) */}
                        <defs>
                            <linearGradient id="gradientLow" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2563EB" stopOpacity="1" />
                                <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.95" />
                                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.9" />
                            </linearGradient>
                            <linearGradient id="gradientMedium" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#16A34A" stopOpacity="1" />
                                <stop offset="50%" stopColor="#22C55E" stopOpacity="0.95" />
                                <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.9" />
                            </linearGradient>
                            <linearGradient id="gradientHigh" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#DC2626" stopOpacity="1" />
                                <stop offset="50%" stopColor="#EF4444" stopOpacity="0.95" />
                                <stop offset="100%" stopColor="#F87171" stopOpacity="0.9" />
                            </linearGradient>

                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* District paths */}
                        <g className={styles.districtsGroup}>
                            {districtGeoData.features.map((feature, i) => {
                                const districtName = getDistrictName(feature);
                                const districtData = getDistrictData(districtName);
                                const isHovered = hoveredDistrict === districtName;
                                const isSelected = selectedDistrict === districtName;
                                const pathD = districtPathGenerator(feature as any) || '';
                                const centroid = districtPathGenerator.centroid(feature as any);

                                return (
                                    <DistrictPath
                                        key={`district-${districtName}-${i}`}
                                        feature={feature}
                                        pathD={pathD}
                                        districtName={districtName}
                                        districtData={districtData}
                                        isHovered={isHovered}
                                        isSelected={isSelected}
                                        centroid={centroid}
                                        onMouseEnter={handleDistrictMouseEnter}
                                        onMouseLeave={handleDistrictMouseLeave}
                                        onClick={() => handleDistrictClick(districtName)}
                                    />
                                );
                            })}
                        </g>
                    </motion.svg>
                )}
            </AnimatePresence>

            {/* Tooltip */}
            <AnimatePresence mode="wait">
                {tooltipData && (
                    <MapTooltip
                        x={tooltipData.x}
                        y={tooltipData.y}
                        data={tooltipData.state || tooltipData.district}
                        isDistrict={!!tooltipData.district}
                    />
                )}
            </AnimatePresence>

            {/* Map Legend */}
            <div className={styles.legend}>
                <h4>Demand Intensity</h4>
                <div className={styles.legendItems}>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#3B82F6' }} />
                        <span>Low</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#22C55E' }} />
                        <span>Medium</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#EF4444' }} />
                        <span>High</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
