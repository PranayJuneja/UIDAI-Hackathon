"use client";

import { motion } from "framer-motion";
import SiteHeader from "../components/SiteHeader";
import styles from "../components/Home/Home.module.css";
import { BrainCircuit, GitBranch, Search, Zap } from "lucide-react";

export default function MLPage() {
    return (
        <main className="min-h-screen bg-[#1c1b1f] text-white">
            <div className="aurora" style={{ background: 'radial-gradient(at 50% 50%, rgba(244, 63, 94, 0.15) 0%, transparent 70%)' }} />
            <div className="gridOverlay" />
            <SiteHeader />

            <section className={styles.heroSection} style={{ minHeight: '60vh', paddingBottom: 0 }}>
                <motion.div className={styles.heroContent} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={styles.heroBadge}><BrainCircuit size={14} /> ARTIFICIAL INTELLIGENCE</div>
                    <h1 className={styles.heroTitle}>Forecast Foundation</h1>
                    <p className={styles.heroSubtitle}>
                        Zero-shot time series prediction using Amazon Chronos and our proprietary Spatial Parallel Search.
                    </p>
                </motion.div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.pulseContainer} style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                        <motion.div>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>The "Time Machine" Logic</h2>
                            <p className={styles.heroSubtitle} style={{ textAlign: 'left', marginLeft: 0 }}>
                                India is vast. The future of a developing town often mirrors the past of a developed city.
                            </p>

                            <div className={styles.vectorCard} style={{ marginTop: '2rem', padding: '2rem' }}>
                                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                    Algorithm: Spatial Parallel Search
                                </h3>
                                <ol style={{ listStyle: 'decimal', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <li>
                                        <strong>Vectorization:</strong> Convert target PIN's recent history into a Pulse Vector embedding.
                                    </li>
                                    <li>
                                        <strong>KNN Search:</strong> Scan 19,000+ PINs to find "Parallel Universes" — regions that behaved exactly like the target <em className="text-[#A78BFA]">n-months ago</em>.
                                    </li>
                                    <li>
                                        <strong>Trajectory Cloning:</strong> If PIN A (Target) matches PIN B (Source) from 6 months ago, then PIN B's current state is PIN A's likely future.
                                    </li>
                                </ol>
                            </div>
                        </motion.div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div className={styles.statIcon} style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#F43F5E' }}><Zap /></div>
                                <div>
                                    <strong>Amazon Chronos (T5)</strong>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Foundation model for base forecasts</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' }}><Search /></div>
                                <div>
                                    <strong>Cosine Similarity</strong>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Matching vector signatures</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}><GitBranch /></div>
                                <div>
                                    <strong>Hybrid Ensemble</strong>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Weighted avg of AI + Spatial</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
