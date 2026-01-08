"use client";

import { motion } from "framer-motion";
import SiteHeader from "../components/SiteHeader";
import styles from "../components/Home/Home.module.css";
import { Layers, Zap, Smartphone, Palette } from "lucide-react";

export default function FrontendPage() {
    return (
        <main className="min-h-screen bg-[#1c1b1f] text-white">
            <div className="aurora" style={{ background: 'radial-gradient(at 80% 0%, rgba(129, 140, 248, 0.3) 0%, transparent 70%)' }} />
            <div className="gridOverlay" />
            <SiteHeader />

            <section className={styles.heroSection} style={{ minHeight: '60vh', paddingBottom: 0 }}>
                <motion.div className={styles.heroContent} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={styles.heroBadge}><Palette size={14} /> USER EXPERIENCE</div>
                    <h1 className={styles.heroTitle}>The Interface Layer</h1>
                    <p className={styles.heroSubtitle}>
                        Engineered with <span className="text-[#A78BFA]">TissueDeck</span> design tokens. 60fps animations. Zero layout shift.
                    </p>
                </motion.div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.pulseContainer} style={{ gridTemplateColumns: '1fr 1.2fr', gap: '4rem' }}>

                        <motion.div
                            className={styles.vectorCard}
                            style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                        >
                            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', transform: 'rotate(-6deg) translateY(-20px)', zIndex: 2 }}></div>
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(77, 182, 172, 0.2), rgba(77, 182, 172, 0.05))', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(77, 182, 172, 0.2)', transform: 'rotate(6deg) translateY(20px)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '4rem' }}>💎</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left', fontSize: '2.5rem' }}>
                                Glassmorphism 2.0
                            </h2>
                            <p className={styles.heroSubtitle} style={{ textAlign: 'left', marginLeft: 0 }}>
                                We don't just use transparency. We use physics-based lighting, multi-layered backdrops, and hardware-accelerated blurs.
                            </p>

                            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                {[
                                    { title: "Backdrop Filter", val: "blur(20px)", color: "#A78BFA" },
                                    { title: "Border Alpha", val: "rgba(255,255,255,0.1)", color: "#ccc" },
                                    { title: "Shadow Depth", val: "0 8px 32px", color: "#FBBF24" },
                                    { title: "Noise Texture", val: "opacity: 0.03", color: "#34D399" },
                                ].map((t, i) => (
                                    <div key={i} style={{ borderLeft: `2px solid ${t.color}`, paddingLeft: '1rem' }}>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase' }}>{t.title}</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>{t.val}</div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                    </div>
                </div>
            </section>

            <section className={styles.section} style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Performance Architecture</h2>
                    </div>
                    <div className={styles.statsGrid}>
                        <div className={styles.vectorCard}>
                            <Layers size={32} style={{ marginBottom: '1rem', color: '#4DB6AC' }} />
                            <h3>Client Compositon</h3>
                            <p style={{ opacity: 0.7 }}>React Server Components (RSC) handle data fetching, while "Client Islands" handle interaction.</p>
                        </div>
                        <div className={styles.vectorCard}>
                            <Zap size={32} style={{ marginBottom: '1rem', color: '#FBBF24' }} />
                            <h3>Memoized D3</h3>
                            <p style={{ opacity: 0.7 }}>Map paths are cached via <code>React.memo</code>. Hover effects use pure CSS to bypass React renders.</p>
                        </div>
                        <div className={styles.vectorCard}>
                            <Smartphone size={32} style={{ marginBottom: '1rem', color: '#A78BFA' }} />
                            <h3>Responsive Grid</h3>
                            <p style={{ opacity: 0.7 }}>Fluid typography and grid layouts that adapt from 4K dashboards to mobile screens.</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
