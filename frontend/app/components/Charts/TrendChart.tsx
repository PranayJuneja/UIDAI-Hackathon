"use client";

import React, { memo, useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import styles from './TrendChart.module.css';

export interface DataPoint {
    month: string;
    growth: number;
    flow: number;
    labor: number;
}

export interface TrendChartProps {
    data: DataPoint[];
    height?: number;
    showLegend?: boolean;
    animationDuration?: number;
    onPointHover?: (point: DataPoint | null) => void;
}

interface TooltipData {
    x: number;
    y: number;
    point: DataPoint;
}

const SERIES_CONFIG = {
    growth: {
        label: 'Growth',
        color: 'var(--signal-growth)',
        colorRaw: '#4DB6AC',
    },
    flow: {
        label: 'Flow',
        color: 'var(--signal-flow)',
        colorRaw: '#D0BCFF',
    },
    labor: {
        label: 'Labor',
        color: 'var(--signal-labor)',
        colorRaw: '#FFE082',
    },
};

type SeriesKey = keyof typeof SERIES_CONFIG;

const TrendChart = memo(function TrendChart({
    data,
    height = 200,
    showLegend = true,
    animationDuration = 800,
    onPointHover,
}: TrendChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 400, height });
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [visibleSeries, setVisibleSeries] = useState<Set<SeriesKey>>(
        new Set(['growth', 'flow', 'labor'])
    );

    // Responsive sizing
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setDimensions({
                    width: entry.contentRect.width,
                    height,
                });
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [height]);

    // Chart margins
    const margin = useMemo(() => ({
        top: 20,
        right: 20,
        bottom: 30,
        left: 45,
    }), []);

    // Scales
    const { xScale, yScale } = useMemo(() => {
        const innerWidth = dimensions.width - margin.left - margin.right;
        const innerHeight = dimensions.height - margin.top - margin.bottom;

        const xScale = d3.scalePoint<string>()
            .domain(data.map(d => d.month))
            .range([0, innerWidth])
            .padding(0.1);

        // Find max value across all visible series
        let maxVal = 0;
        data.forEach(d => {
            if (visibleSeries.has('growth')) maxVal = Math.max(maxVal, d.growth);
            if (visibleSeries.has('flow')) maxVal = Math.max(maxVal, d.flow);
            if (visibleSeries.has('labor')) maxVal = Math.max(maxVal, d.labor);
        });

        const yScale = d3.scaleLinear()
            .domain([0, maxVal * 1.1 || 1])
            .range([innerHeight, 0])
            .nice();

        return { xScale, yScale };
    }, [data, dimensions, margin, visibleSeries]);

    // Line generators
    const lineGenerators = useMemo(() => {
        return {
            growth: d3.line<DataPoint>()
                .x(d => xScale(d.month) || 0)
                .y(d => yScale(d.growth))
                .curve(d3.curveMonotoneX),
            flow: d3.line<DataPoint>()
                .x(d => xScale(d.month) || 0)
                .y(d => yScale(d.flow))
                .curve(d3.curveMonotoneX),
            labor: d3.line<DataPoint>()
                .x(d => xScale(d.month) || 0)
                .y(d => yScale(d.labor))
                .curve(d3.curveMonotoneX),
        };
    }, [xScale, yScale]);

    // Toggle series visibility
    const toggleSeries = useCallback((series: SeriesKey) => {
        setVisibleSeries(prev => {
            const next = new Set(prev);
            if (next.has(series)) {
                // Don't allow hiding all series
                if (next.size > 1) {
                    next.delete(series);
                }
            } else {
                next.add(series);
            }
            return next;
        });
    }, []);

    // Handle mouse move for tooltip
    const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current || data.length === 0) return;

        const svgRect = svgRef.current.getBoundingClientRect();
        const mouseX = event.clientX - svgRect.left - margin.left;

        // Find closest data point
        let closestPoint: DataPoint | null = null;
        let closestDistance = Infinity;

        data.forEach(point => {
            const pointX = xScale(point.month) || 0;
            const distance = Math.abs(mouseX - pointX);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = point;
            }
        });

        if (closestPoint && closestDistance < 50) {
            const point = closestPoint as DataPoint;
            setTooltip({
                x: (xScale(point.month) || 0) + margin.left,
                y: event.clientY - svgRect.top,
                point: point,
            });
            onPointHover?.(point);
        } else {
            setTooltip(null);
            onPointHover?.(null);
        }
    }, [data, xScale, margin, onPointHover]);

    const handleMouseLeave = useCallback(() => {
        setTooltip(null);
        onPointHover?.(null);
    }, [onPointHover]);

    // Format month for display
    const formatMonth = (month: string) => {
        try {
            const [year, m] = month.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[parseInt(m) - 1]} '${year.slice(2)}`;
        } catch {
            return month;
        }
    };

    if (!data || data.length === 0) {
        return (
            <div className={styles.container} ref={containerRef}>
                <div className={styles.empty}>
                    <span className={styles.emptyIcon}>📊</span>
                    <span className={styles.emptyText}>No trend data available</span>
                </div>
            </div>
        );
    }

    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    return (
        <div className={styles.container} ref={containerRef}>
            {/* Legend */}
            {showLegend && (
                <div className={styles.legend}>
                    {(Object.keys(SERIES_CONFIG) as SeriesKey[]).map((key) => (
                        <button
                            key={key}
                            className={`${styles.legendItem} ${!visibleSeries.has(key) ? styles.inactive : ''}`}
                            onClick={() => toggleSeries(key)}
                            type="button"
                        >
                            <span
                                className={styles.legendDot}
                                style={{ background: SERIES_CONFIG[key].colorRaw }}
                            />
                            <span className={styles.legendLabel}>
                                {SERIES_CONFIG[key].label}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Chart */}
            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className={styles.svg}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <defs>
                    {/* Gradient fills for each series */}
                    {(Object.keys(SERIES_CONFIG) as SeriesKey[]).map((key) => (
                        <linearGradient
                            key={key}
                            id={`gradient-${key}`}
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                        >
                            <stop offset="0%" stopColor={SERIES_CONFIG[key].colorRaw} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={SERIES_CONFIG[key].colorRaw} stopOpacity="0" />
                        </linearGradient>
                    ))}
                </defs>

                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Grid lines */}
                    {yScale.ticks(5).map((tick) => (
                        <g key={tick}>
                            <line
                                x1={0}
                                x2={innerWidth}
                                y1={yScale(tick)}
                                y2={yScale(tick)}
                                className={styles.gridLine}
                            />
                            <text
                                x={-10}
                                y={yScale(tick)}
                                className={styles.axisLabel}
                                textAnchor="end"
                                dominantBaseline="middle"
                            >
                                {tick.toFixed(1)}
                            </text>
                        </g>
                    ))}

                    {/* X-axis labels */}
                    {data.map((d, i) => (
                        <text
                            key={d.month}
                            x={xScale(d.month) || 0}
                            y={innerHeight + 20}
                            className={styles.axisLabel}
                            textAnchor="middle"
                        >
                            {i % Math.ceil(data.length / 6) === 0 ? formatMonth(d.month) : ''}
                        </text>
                    ))}

                    {/* Area fills */}
                    {(Object.keys(SERIES_CONFIG) as SeriesKey[]).map((key) => {
                        if (!visibleSeries.has(key)) return null;

                        const areaGenerator = d3.area<DataPoint>()
                            .x(d => xScale(d.month) || 0)
                            .y0(innerHeight)
                            .y1(d => yScale(d[key]))
                            .curve(d3.curveMonotoneX);

                        return (
                            <motion.path
                                key={`area-${key}`}
                                d={areaGenerator(data) || ''}
                                fill={`url(#gradient-${key})`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: animationDuration / 1000 }}
                            />
                        );
                    })}

                    {/* Lines */}
                    {(Object.keys(SERIES_CONFIG) as SeriesKey[]).map((key) => {
                        if (!visibleSeries.has(key)) return null;

                        const pathData = lineGenerators[key](data) || '';
                        const pathLength = pathData.length;

                        return (
                            <motion.path
                                key={`line-${key}`}
                                d={pathData}
                                fill="none"
                                stroke={SERIES_CONFIG[key].colorRaw}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{
                                    strokeDasharray: pathLength,
                                    strokeDashoffset: pathLength,
                                    opacity: 0
                                }}
                                animate={{
                                    strokeDashoffset: 0,
                                    opacity: 1
                                }}
                                transition={{
                                    duration: animationDuration / 1000,
                                    ease: "easeOut"
                                }}
                            />
                        );
                    })}

                    {/* Data points */}
                    {(Object.keys(SERIES_CONFIG) as SeriesKey[]).map((key) => {
                        if (!visibleSeries.has(key)) return null;

                        return data.map((d, i) => (
                            <motion.circle
                                key={`point-${key}-${i}`}
                                cx={xScale(d.month) || 0}
                                cy={yScale(d[key])}
                                r={4}
                                fill={SERIES_CONFIG[key].colorRaw}
                                stroke="var(--bg-base)"
                                strokeWidth={2}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                    delay: (animationDuration / 1000) + (i * 0.05),
                                    duration: 0.2
                                }}
                                className={styles.dataPoint}
                            />
                        ));
                    })}

                    {/* Tooltip line */}
                    {tooltip && (
                        <motion.line
                            x1={tooltip.x - margin.left}
                            x2={tooltip.x - margin.left}
                            y1={0}
                            y2={innerHeight}
                            className={styles.tooltipLine}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                    )}
                </g>
            </svg>

            {/* Tooltip */}
            <AnimatePresence>
                {tooltip && (
                    <motion.div
                        className={styles.tooltip}
                        style={{
                            left: tooltip.x,
                            top: tooltip.y,
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div className={styles.tooltipHeader}>
                            {formatMonth(tooltip.point.month)}
                        </div>
                        <div className={styles.tooltipContent}>
                            {visibleSeries.has('growth') && (
                                <div className={styles.tooltipRow}>
                                    <span
                                        className={styles.tooltipDot}
                                        style={{ background: SERIES_CONFIG.growth.colorRaw }}
                                    />
                                    <span>Growth:</span>
                                    <span className={styles.tooltipValue}>
                                        {tooltip.point.growth.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {visibleSeries.has('flow') && (
                                <div className={styles.tooltipRow}>
                                    <span
                                        className={styles.tooltipDot}
                                        style={{ background: SERIES_CONFIG.flow.colorRaw }}
                                    />
                                    <span>Flow:</span>
                                    <span className={styles.tooltipValue}>
                                        {tooltip.point.flow.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            {visibleSeries.has('labor') && (
                                <div className={styles.tooltipRow}>
                                    <span
                                        className={styles.tooltipDot}
                                        style={{ background: SERIES_CONFIG.labor.colorRaw }}
                                    />
                                    <span>Labor:</span>
                                    <span className={styles.tooltipValue}>
                                        {tooltip.point.labor.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export default TrendChart;
