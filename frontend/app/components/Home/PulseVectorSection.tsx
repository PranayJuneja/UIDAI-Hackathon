"use client";

import { motion } from "framer-motion";
import { Activity, Layers, Sparkles, ArrowRight } from "lucide-react";
import styles from "./Home.module.css";

export default function PulseVectorSection() {
    const signals = [
        {
            id: "growth",
            name: "Growth Signal (G)",
            desc: "Tracks new family settlements via 0-5 age enrolments.",
            icon: <Sparkles size={24} />,
            color: "var(--signal-growth)",
            gradient: "var(--gradient-growth)",
            value: "High Velocity"
        },
        {
            id: "flow",
            name: "Flow Signal (F)",
            desc: "Monitors urbanization drifts via address updates.",
            icon: <Activity size={24} />,
            color: "var(--signal-flow)",
            gradient: "var(--gradient-flow)",
            value: "Stable"
        },
        {
            id: "labor",
            name: "Labor Signal (L)",
            desc: "Detects workforce shifts using biometric authentications.",
            icon: <Layers size={24} />,
            color: "var(--signal-labor)",
            gradient: "var(--gradient-labor)",
            value: "Seasonal Spike"
        }
    ];

    return (
        <section className={styles.section} id="pulse-vector">
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>The Pulse Vector</h2>
                    <p className={styles.heroSubtitle}>
                        We don't just count transactions. We measure the <span className={styles.gradientText}>heartbeat</span> of every district.
                    </p>
                </div>

                <div className={styles.pulseContainer}>
                    {/* Left: Text Explanation */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        {signals.map((signal, i) => (
                            <div key={signal.id} className={styles.signalRow}>
                                <div className={styles.signalHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: signal.color }}>
                                        {signal.icon}
                                        <strong>{signal.name}</strong>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{signal.value}</span>
                                </div>
                                <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '8px' }}>{signal.desc}</p>
                                <div className={styles.signalBar}>
                                    <motion.div
                                        className={styles.signalFill}
                                        style={{ background: signal.gradient }}
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${60 + i * 15}%` }}
                                        transition={{ duration: 1.5, delay: 0.2 }}
                                    />
                                </div>
                            </div>
                        ))}

                        <div className={styles.mathBlock}>
                            <code>V<sub>p,t</sub> = [ G<sub>norm</sub>, F<sub>norm</sub>, L<sub>norm</sub> ]</code>
                            <br />
                            <span style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '8px', display: 'block' }}>
                                * Z-Score Normalized for cross-regional comparability
                            </span>
                        </div>
                    </motion.div>

                    {/* Right: Visual */}
                    <motion.div
                        className={styles.pulseVisual}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        {/* 3D Abstract Representation */}
                        <svg width="400" height="400" viewBox="0 0 400 400" fill="none">
                            <defs>
                                <filter id="glow-pulse" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="10" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#4DB6AC" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#80CBC4" stopOpacity="0.2" />
                                </linearGradient>
                                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#D0BCFF" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#EADDFF" stopOpacity="0.2" />
                                </linearGradient>
                                <linearGradient id="grad3" x1="0%" y1="100%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#FFE082" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#FFECB3" stopOpacity="0.2" />
                                </linearGradient>
                            </defs>

                            <motion.circle
                                cx="200" cy="200" r="100"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1 }}
                            />
                            <motion.circle
                                cx="200" cy="200" r="150"
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                            />

                            {/* Axis Lines */}
                            <line x1="200" y1="200" x2="200" y2="50" stroke="rgba(255,255,255,0.1)" />
                            <line x1="200" y1="200" x2="350" y2="300" stroke="rgba(255,255,255,0.1)" />
                            <line x1="200" y1="200" x2="50" y2="300" stroke="rgba(255,255,255,0.1)" />

                            {/* Signals */}
                            <motion.circle cx="200" cy="80" r="8" fill="url(#grad1)" filter="url(#glow-pulse)"
                                animate={{ cy: [80, 90, 80] }} transition={{ duration: 4, repeat: Infinity }} />
                            <motion.path d="M200 200 L200 80" stroke="url(#grad1)" strokeWidth="2" opacity="0.5" />

                            <motion.circle cx="320" cy="280" r="8" fill="url(#grad2)" filter="url(#glow-pulse)"
                                animate={{ cx: [320, 310, 320], cy: [280, 275, 280] }} transition={{ duration: 5, repeat: Infinity }} />
                            <motion.path d="M200 200 L320 280" stroke="url(#grad2)" strokeWidth="2" opacity="0.5" />

                            <motion.circle cx="80" cy="280" r="8" fill="url(#grad3)" filter="url(#glow-pulse)"
                                animate={{ cx: [80, 90, 80], cy: [280, 275, 280] }} transition={{ duration: 6, repeat: Infinity }} />
                            <motion.path d="M200 200 L80 280" stroke="url(#grad3)" strokeWidth="2" opacity="0.5" />

                            {/* Connecting Area */}
                            <motion.path
                                d="M200 80 L320 280 L80 280 Z"
                                fill="rgba(255,255,255,0.03)"
                                stroke="white"
                                strokeWidth="1"
                                strokeOpacity="0.1"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 2, delay: 0.5 }}
                            />
                        </svg>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
