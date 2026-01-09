import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3-geo';
import { useMapStore, GeoFeature, GeoJSON, DistrictData, StateData } from '../../stores/mapStore';
import { useMapData, getStateIdFromGeoJSON } from '../../hooks/useMapData';
import { useDistrictData } from '../../hooks/useDistrictData';
import MapTooltip from './MapTooltip';
import TerminalInfoDisplay from './TerminalInfoDisplay';
import styles from './IndiaMap.module.css';
import { useToast } from '../UI/ToastProvider';


// Traffic-light style color palette
function getIntensityColor(intensity: number): string {
    if (intensity <= 0.50) return '#3B82F6';  // Blue
    if (intensity <= 0.55) return '#22C55E';  // Green
    return '#EF4444';  // Red
}

/* 
 * MapVisuals: The heavy SVG component.
 * Memoized to prevent re-renders when only tooltip state changes in the parent.
 */
interface MapVisualsProps {
    viewMode: 'india' | 'state';
    geoData: GeoJSON | null;
    districtGeoData: GeoJSON | null;
    selectedState: string | null;
    selectedDistrict: string | null;
    // Removed hoveredState/District to prevent re-renders
    onStateHover: (e: React.MouseEvent, feature: GeoFeature) => void;
    onStateLeave: () => void;
    onStateClick: (e: React.MouseEvent, stateId: string | undefined, stateName: string) => void;
    onDistrictHover: (e: React.MouseEvent, feature: GeoFeature, districtName: string) => void;
    onDistrictLeave: () => void;
    onDistrictClick: (e: React.MouseEvent, districtName: string) => void;
    getStateName: (feature: GeoFeature) => string;
    getStateData: (geoName: string) => any;
    getDistrictName: (feature: GeoFeature) => string;
    getDistrictData: (districtName: string) => DistrictData | undefined;
    stateAbbreviations: { [key: string]: string };
}

const MapVisuals = memo(function MapVisuals({
    viewMode,
    geoData,
    districtGeoData,
    selectedState,
    selectedDistrict,
    onStateHover,
    onStateLeave,
    onStateClick,
    onDistrictHover,
    onDistrictLeave,
    onDistrictClick,
    getStateName,
    getStateData,
    getDistrictName,
    getDistrictData,
    stateAbbreviations
}: MapVisualsProps) {

    // Memoize Projections
    const indiaProjection = useMemo(() => d3.geoMercator()
        .center([82.5, 23])
        .scale(1250)
        .translate([400, 380]), []);

    const indiaPathGenerator = useMemo(() => d3.geoPath().projection(indiaProjection), [indiaProjection]);

    const districtProjection = useMemo(() => {
        if (!districtGeoData) return null;
        const projection = d3.geoMercator();
        projection.fitExtent(
            [[50, 50], [750, 730]],
            districtGeoData as any
        );
        return projection;
    }, [districtGeoData]);

    const districtPathGenerator = useMemo(() =>
        districtProjection ? d3.geoPath().projection(districtProjection) : null,
        [districtProjection]);

    return (
        <AnimatePresence mode="wait">
            {viewMode === 'india' && geoData && (
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
                    <g className={styles.statesGroup}>
                        {geoData.features.map((feature, i) => {
                            const name = getStateName(feature);
                            const displayName = stateAbbreviations[name] || name;
                            const stateId = getStateIdFromGeoJSON(name);
                            const stateData = getStateData(name);
                            const intensity = stateData?.hotspot?.intensity || 0;
                            const hasData = !!stateData;
                            const isSelected = stateId ? selectedState === stateId : false;

                            const pathD = indiaPathGenerator(feature as any) || '';
                            const centroid = indiaPathGenerator.centroid(feature as any);
                            const fill = hasData ? getIntensityColor(intensity) : '#374151';

                            return (
                                <g
                                    key={`state-${stateId || name}-${i}`}
                                    className={`${styles.stateGroup} ${isSelected ? styles.selectedGroup : ''}`}
                                    onMouseEnter={(e) => onStateHover(e, feature)}
                                    onMouseLeave={onStateLeave}
                                    onClick={(e) => onStateClick(e, stateId, name)}
                                >
                                    <path
                                        d={pathD}
                                        className={styles.statePath}
                                        style={{
                                            fill: fill,
                                            fillOpacity: hasData ? 0.85 : 0.4,
                                            // Stroke handled by CSS mostly, but selected needs inline or class
                                        }}
                                    />
                                    {centroid && (
                                        <text
                                            x={centroid[0]}
                                            y={centroid[1]}
                                            className={styles.stateLabel}
                                        >
                                            {displayName}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </motion.svg>
            )}

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
                    <g className={styles.districtsGroup}>
                        {districtGeoData.features.map((feature, i) => {
                            const districtName = getDistrictName(feature);
                            const districtData = getDistrictData(districtName);
                            const isSelected = selectedDistrict === districtName;

                            const pathD = districtPathGenerator(feature as any) || '';
                            const centroid = districtPathGenerator.centroid(feature as any);

                            const intensity = districtData?.hotspot?.intensity || 0;
                            const hasData = !!districtData;
                            const fill = hasData ? getIntensityColor(intensity) : '#374151';

                            return (
                                <g
                                    key={`district-${districtName}-${i}`}
                                    className={`${styles.districtGroup} ${isSelected ? styles.selectedGroup : ''}`}
                                    onMouseEnter={(e) => onDistrictHover(e, feature, districtName)}
                                    onMouseLeave={onDistrictLeave}
                                    onClick={(e) => onDistrictClick(e, districtName)}
                                >
                                    <path
                                        d={pathD}
                                        className={styles.districtPath}
                                        style={{
                                            fill: fill,
                                            fillOpacity: hasData ? 0.85 : 0.4,
                                        }}
                                    />
                                    {centroid && (
                                        <text
                                            x={centroid[0]}
                                            y={centroid[1]}
                                            className={styles.districtLabel}
                                        >
                                            {districtName}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </motion.svg>
            )}
        </AnimatePresence>
    );
});

// Icon
const BackArrowIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
    </svg>
);

const stateAbbreviations: { [key: string]: string } = {
    "Andaman and Nicobar Islands": "A&N",
    "Arunachal Pradesh": "Arunachal",
    "Dadra and Nagar Haveli and Daman and Diu": "DNH & DD",
    "Jammu and Kashmir": "J&K",
    "Madhya Pradesh": "MP",
    "Uttar Pradesh": "UP",
    "Andhra Pradesh": "AP",
    "Himachal Pradesh": "HP",
    "West Bengal": "WB",
    "Tamil Nadu": "TN",
    "NCT of Delhi": "Delhi",
    "Lakshadweep": "LD",
    "Chhattisgarh": "C.garh",
    "Chandigarh": "Ch.garh"
};

export default function IndiaMap() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [geoData, setGeoData] = useState<GeoJSON | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);

    // Tooltip state local to this component, but using MapVisuals prevents full re-render of SVG
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
        states,
        loading,
        error,
        viewMode,
        selectedStateName,
        drillIntoState,
        drillBackToIndia,
        loadingDistricts,
        selectedDistrict,
        setSelectedDistrict,
        terminalInfo,
        showTerminal,
        hideTerminal,
    } = useMapStore();

    useMapData();
    const { districts, districtGeoData, getDistrictName, getDistrictData } = useDistrictData();

    // UI Effects
    const toast = useToast();

    // Pending drill-down state (used after terminal animation completes)
    const [pendingDrill, setPendingDrill] = useState<{ stateId: string; stateName: string } | null>(null);

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && viewMode === 'state') {
                drillBackToIndia();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, drillBackToIndia]);

    // Helpers (Memoized)
    const getStateName = useCallback((feature: GeoFeature): string => {
        return feature.properties.ST_NM || feature.properties.NAME_1 || feature.properties.name || '';
    }, []);

    const getStateData = useCallback((geoName: string) => {
        const stateId = getStateIdFromGeoJSON(geoName);
        if (!stateId) return null;
        return states.find(s => s.state_id === stateId);
    }, [states]);

    // Handlers
    const handleStateMouseEnter = useCallback((e: React.MouseEvent, feature: GeoFeature) => {
        const name = getStateName(feature);
        const stateId = getStateIdFromGeoJSON(name);
        if (stateId) {
            setHoveredState(stateId);
            let x = e.clientX + 15;
            let y = e.clientY + 15;
            if (x > window.innerWidth - 220) x = e.clientX - 220;
            if (y > window.innerHeight - 150) y = e.clientY - 150;

            setTooltipData({
                x, y,
                state: getStateData(name) || { name, state_id: stateId }
            });
        }
    }, [getStateName, getStateData, setHoveredState]);

    const handleStateMouseLeave = useCallback(() => {
        setHoveredState(null);
        setTooltipData(null);
    }, [setHoveredState]);

    const handleStateClick = useCallback((e: React.MouseEvent, stateId: string | undefined, stateName: string) => {
        if (stateId && stateName) {
            // Get state data for terminal display
            const stateData = states.find(s => s.state_id === stateId);

            if (stateData) {
                // Show terminal with state data
                showTerminal('state', stateData, 'overlay');
                // Store pending drill-down for after animation
                setPendingDrill({ stateId, stateName });
            } else {
                // Fallback: direct drill if no data (shouldn't happen)
                toast.info(`Drilling into ${stateName}`, "Fetching district data...");
                drillIntoState(stateId, stateName);
            }

            setTooltipData(null);
            setHoveredState(null);
        }
    }, [states, showTerminal, drillIntoState, setHoveredState, toast]);

    // Handle terminal completion - proceed with drill-down
    const handleTerminalComplete = useCallback(() => {
        if (pendingDrill) {
            hideTerminal();
            toast.info(`Drilling into ${pendingDrill.stateName}`, "Fetching district data...");
            drillIntoState(pendingDrill.stateId, pendingDrill.stateName);
            setPendingDrill(null);
        }
    }, [pendingDrill, hideTerminal, drillIntoState, toast]);

    const handleDistrictMouseEnter = useCallback((e: React.MouseEvent, feature: GeoFeature, districtName: string) => {
        setHoveredDistrict(districtName);
        const districtData = getDistrictData(districtName);
        let x = e.clientX + 15;
        let y = e.clientY + 15;
        if (x > window.innerWidth - 220) x = e.clientX - 220;
        if (y > window.innerHeight - 150) y = e.clientY - 150;

        setTooltipData({
            x, y,
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

    const handleDistrictClick = useCallback((e: React.MouseEvent, districtName: string) => {
        // For Phase 1, just select/deselect district (Phase 2 will add terminal)
        if (selectedDistrict === districtName) {
            setSelectedDistrict(null);
        } else {
            setSelectedDistrict(districtName);
            toast.success("District Selected", `Showing details for ${districtName}`);
        }
    }, [selectedDistrict, setSelectedDistrict, toast]);

    if (geoError || error) {
        return <div className={styles.mapError}><span>⚠️</span><span>{geoError || error}</span></div>;
    }

    if (!geoData || loading) {
        return <div className={styles.mapLoading}><div className={styles.loadingPulse}></div><span>Loading Map...</span></div>;
    }

    return (
        <div ref={containerRef} className={styles.mapContainer}>
            {/* Terminal Info Display - Phase 1: State overlay */}
            <AnimatePresence>
                {terminalInfo.visible && terminalInfo.type === 'state' && terminalInfo.data && (
                    <TerminalInfoDisplay
                        type="state"
                        data={terminalInfo.data as StateData}
                        layout="overlay"
                        onComplete={handleTerminalComplete}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewMode === 'state' && (
                    <motion.button
                        className={styles.backButton}
                        onClick={() => { setTooltipData(null); drillBackToIndia(); }}
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

            <div className={styles.breadcrumb}>
                <span
                    className={`${styles.breadcrumbItem} ${viewMode === 'india' ? styles.active : styles.clickable}`}
                    onClick={viewMode === 'state' ? () => { setTooltipData(null); drillBackToIndia(); } : undefined}
                >
                    🇮🇳
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

            <AnimatePresence>
                {loadingDistricts && (
                    <motion.div
                        className={styles.loadingOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className={styles.loadingPulse}></div>
                        <span>Loading districts...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Render Visuals with Memoization */}
            <MapVisuals
                viewMode={viewMode}
                geoData={geoData}
                districtGeoData={districtGeoData}
                selectedState={selectedState}
                selectedDistrict={selectedDistrict}
                onStateHover={handleStateMouseEnter}
                onStateLeave={handleStateMouseLeave}
                onStateClick={handleStateClick}
                onDistrictHover={handleDistrictMouseEnter}
                onDistrictLeave={handleDistrictMouseLeave}
                onDistrictClick={handleDistrictClick}
                getStateName={getStateName}
                getStateData={getStateData}
                getDistrictName={getDistrictName}
                getDistrictData={getDistrictData}
                stateAbbreviations={stateAbbreviations}
            />

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
