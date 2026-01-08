"use client";

import { motion } from "framer-motion";
import SiteHeader from "../components/SiteHeader";
import styles from "../components/Home/Home.module.css";
import { Box, Map, Activity, BarChart } from "lucide-react";

export default function VisualizationPage() {
    return (
        <main className="min-h-screen bg-[#1c1b1f] text-white">
            <div className="aurora" style={{ background: 'radial-gradient(at 20% 100%, rgba(245, 158, 11, 0.2) 0%, transparent 70%)' }} />
            <div className="gridOverlay" />
            <SiteHeader />

            <section className={styles.heroSection} style={{ minHeight: '60vh', paddingBottom: 0 }}>
                <motion.div className={styles.heroContent} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={styles.heroBadge}><Box size={14} /> VISUAL INTELLIGENCE</div>
                    <h1 className={styles.heroTitle}>Seeing the Unseen</h1>
                    <p className={styles.heroSubtitle}>
                        Transforming abstract signals into human-perceivable patterns using D3.js and geospatial vectors.
                    </p>
                </motion.div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>The Pulse Vector Explained</h2>
                        <p style={{ maxWidth: '600px', margin: '0 auto', color: '#aaa', lineHeight: 1.6 }}>
                            How do we compare a village of 500 to a city of 5 million? <br />
                            <strong style={{ color: 'white' }}>Z-Score Normalization.</strong>
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '4rem' }}>
                        {[
                            { id: 'Growth', symbol: 'G', color: 'var(--signal-growth)', desc: "0-5 Age Enrolments. Leading indicator of family settlements." },
                            { id: 'Flow', symbol: 'F', color: 'var(--signal-flow)', desc: "Demographic Updates. Proxy for urban migration/address changes." },
                            { id: 'Labor', symbol: 'L', color: 'var(--signal-labor)', desc: "Biometric Updates. Proxy for manual workforce activity." },
                        ].map((sig, i) => (
                            <motion.div
                                key={i}
                                className={styles.vectorCard}
                                whileHover={{ y: -10 }}
                                style={{ borderTop: `4px solid ${sig.color}` }}
                            >
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: sig.color, marginBottom: '1rem' }}>{sig.symbol}</div>
                                <h3>{sig.id} Signal</h3>
                                <p style={{ marginTop: '1rem', opacity: 0.7 }}>{sig.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.section} style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className={styles.container}>
                    <div className={styles.pulseContainer} style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>D3.js Geography</h2>
                            <p className={styles.heroSubtitle} style={{ textAlign: 'left', marginLeft: 0 }}>
                                We render 500+ district paths with <code className="text-[#FBBF24]">d3-geo</code> projections.
                            </p>
                            <ul className={styles.featureList} style={{ marginTop: '2rem' }}>
                                <li style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <Map size={20} className="text-[#34D399]" />
                                    <span><strong>Mercator Projection</strong> tuned for Indian latitude.</span>
                                </li>
                                <li style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <Activity size={20} className="text-[#A78BFA]" />
                                    <span><strong>Dynamic Color Scales</strong> mapping intensity to HSL gradients.</span>
                                </li>
                                <li style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <BarChart size={20} className="text-[#FBBF24]" />
                                    <span><strong>SVG Interactions</strong> without canvas overhead.</span>
                                </li>
                            </ul>
                        </motion.div>

                        <motion.div className={styles.vectorCard} style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ textAlign: 'center', opacity: 0.5 }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🗺️</div>
                                [Interactive Map Rendering Engine]
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
        </main>
    );
}
