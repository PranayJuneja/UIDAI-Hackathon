"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ShieldCheck, Database, Wifi } from "lucide-react";
import styles from "./Home.module.css";

const BOOT_LOGS = [
    "> INITIALIZING CHRONOS-X KERNEL...",
    "> MOUNTING SPATIAL_PARALLEL_SEARCH...",
    "> CONNECTING TO UIDAI_SECURE_GATEWAY... [OK]",
    "> LOADING PULSE_VECTORS (v2.6.0)...",
    "> SYNCING 19,079 PIN CODES...",
    "> CALIBRATING FORECAST HORIZON: 3 MONTHS...",
    "> SYSTEM READY."
];

export default function HeroSection() {
    const [bootStep, setBootStep] = useState(0);
    const [isBooted, setIsBooted] = useState(false);

    useEffect(() => {
        if (bootStep < BOOT_LOGS.length) {
            const timeout = setTimeout(() => {
                setBootStep((prev) => prev + 1);
            }, Math.random() * 300 + 100);
            return () => clearTimeout(timeout);
        } else {
            setTimeout(() => setIsBooted(true), 800);
        }
    }, [bootStep]);

    return (
        <section className={styles.heroSection}>
            {!isBooted ? (
                <div className={styles.terminalBoot}>
                    <div className={styles.terminalHeader}>
                        <Terminal size={16} />
                        <span>chronos_x_boot.sh</span>
                    </div>
                    <div className={styles.terminalBody}>
                        {BOOT_LOGS.slice(0, bootStep).map((log, i) => (
                            <div key={i} className={styles.logLine}>
                                {log}
                            </div>
                        ))}
                        <div className={styles.cursor}>_</div>
                    </div>
                </div>
            ) : (
                <motion.div
                    className={styles.heroContent}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className={styles.heroBadge}>
                        <ShieldCheck size={14} />
                        <span>UIDAI HACKATHON 2026</span>
                    </div>

                    <h1 className={styles.heroTitle}>
                        <span className={styles.glitchText} data-text="TEMPORAL">TEMPORAL</span>
                        <br />
                        <span className={styles.gradientText}>SPATIAL INTELLIGENCE</span>
                    </h1>

                    <p className={styles.heroSubtitle}>
                        A centralized nervous system for Aadhaar operations.
                        <br />
                        Constructing <strong>Digital Twins</strong> of 19,000+ PIN codes to predict demand <strong>before it happens</strong>.
                    </p>

                    <div className={styles.statsGrid}>
                        {[
                            { label: "PIN Codes", value: "19,079", icon: <Database size={16} /> },
                            { label: "Data Points", value: "74,000+", icon: <Wifi size={16} /> },
                            { label: "Prediction Accuracy", value: "94.2%", icon: <ShieldCheck size={16} /> },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                className={styles.heroStat}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                            >
                                <div className={styles.statIcon}>{stat.icon}</div>
                                <div className={styles.statInfo}>
                                    <div className={styles.statValue}>{stat.value}</div>
                                    <div className={styles.statLabel}>{stat.label}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className={styles.heroActions} style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '3rem' }}>
                        <button
                            className={styles.btn}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '1rem 2rem',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => window.location.href = '/backend'}
                        >
                            <Database size={16} />
                            System Architecture
                        </button>
                        <button
                            className={styles.btn}
                            style={{
                                background: 'var(--brand-primary)',
                                color: 'black',
                                border: 'none',
                                padding: '1rem 2rem',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => window.location.href = '/dashboard'}
                        >
                            <ShieldCheck size={16} />
                            Launch Dashboard
                        </button>
                    </div>
                </motion.div>
            )}
        </section>
    );
}
