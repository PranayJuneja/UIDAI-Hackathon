"use client";

import { motion } from "framer-motion";
import SiteHeader from "../components/SiteHeader";
import styles from "../components/Home/Home.module.css";
import { Box, Map, Activity, BarChart, Palette, Eye } from "lucide-react";
import { PageTransition } from "../components/UI";

export default function VisualizationPage() {
    return (
        <PageTransition>
            <main className="min-h-screen bg-[#1c1b1f] text-white">
                <div className="aurora" style={{ background: 'radial-gradient(at 20% 100%, rgba(245, 158, 11, 0.2) 0%, transparent 70%)' }} />
                <div className="gridOverlay" />
                <SiteHeader />

                <section className={styles.heroSection} style={{ minHeight: '50vh', paddingBottom: 0 }}>
                    <motion.div className={styles.heroContent} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className={styles.heroBadge}><Box size={14} /> VISUAL INTELLIGENCE</div>
                        <h1 className={styles.heroTitle}>Seeing the Unseen</h1>
                        <p className={styles.heroSubtitle}>
                            Transforming abstract signals into human-perceivable patterns using <span className="text-[#FBBF24]">D3.js</span> and <span className="text-[#34D399]">HSL Interpolation</span>.
                        </p>
                    </motion.div>
                </section>

                <section className={styles.section}>
                    <div className={styles.container}>

                        {/* Section 1: Hotspot Algorithm */}
                        <div className="grid grid-cols-1 gap-12 mb-24">
                            <div className="text-center max-w-3xl mx-auto">
                                <h2 className="text-3xl font-bold mb-6">The Hotspot Algorithm</h2>
                                <div style={{
                                    fontFamily: 'KaTeX_Main, Times New Roman, serif',
                                    fontSize: '2rem',
                                    padding: '2rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '16px',
                                    display: 'inline-block',
                                    margin: '1rem 0',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    I<sub>hotspot</sub> =
                                    <span style={{ color: 'var(--signal-growth)' }}> 0.3 · G<sub>norm</sub></span> +
                                    <span style={{ color: 'var(--signal-flow)' }}> 0.4 · F<sub>norm</sub></span> +
                                    <span style={{ color: 'var(--signal-labor)' }}> 0.3 · L<sub>norm</sub></span>
                                </div>
                                <p className="text-gray-400 mt-4">
                                    We assign a <strong className="text-white">higher weight (0.4) to Flow</strong> because internal migration is the leading indicator of shifting Aadhaar demand, often preceding biometric updates by 2-3 months.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { id: 'Growth', symbol: 'G', color: 'var(--signal-growth)', desc: "0-5 Age Enrolments. Leading indicator of family settlements." },
                                    { id: 'Flow', symbol: 'F', color: 'var(--signal-flow)', desc: "Demographic Updates. Proxy for urban migration/address changes." },
                                    { id: 'Labor', symbol: 'L', color: 'var(--signal-labor)', desc: "Biometric Updates. Proxy for manual workforce activity." },
                                ].map((sig, i) => (
                                    <motion.div
                                        key={i}
                                        className={styles.vectorCard}
                                        whileHover={{ y: -5 }}
                                        style={{ borderTop: `4px solid ${sig.color}` }}
                                    >
                                        <div style={{ fontSize: '3rem', fontWeight: 800, color: sig.color, marginBottom: '0.5rem' }}>{sig.symbol}</div>
                                        <h3 className="text-xl font-bold">{sig.id} Signal</h3>
                                        <p className="mt-2 text-sm text-gray-400">{sig.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Section 2: Visual Engineering */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}>
                                <h2 className="text-3xl font-bold mb-6">Data-Driven Coloring</h2>
                                <p className="text-gray-400 text-lg mb-6">
                                    We don't use static colors. Every district's fill is calculated at runtime using <code>d3-scale-chromatic</code> interpolated over the normalized signal value.
                                </p>

                                <div className="space-y-6">
                                    <div className="flex gap-4 items-start">
                                        <div className="p-3 bg-white/5 rounded-lg border border-white/10"><Palette size={20} className="text-[#A78BFA]" /></div>
                                        <div>
                                            <h4 className="font-bold text-lg">HSL Interpolation</h4>
                                            <p className="text-sm text-gray-500">
                                                <code>d3.interpolateOranges(value)</code> ensures perceptually uniform gradients.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="p-3 bg-white/5 rounded-lg border border-white/10"><Eye size={20} className="text-[#4DB6AC]" /></div>
                                        <div>
                                            <h4 className="font-bold text-lg">Visual Continuity</h4>
                                            <p className="text-sm text-gray-500">
                                                Skeleton loaders match the exact dimensions of D3 charts to prevent layout shift (CLS) during data fetching.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                className="bg-[#1e1e1e] p-6 rounded-xl border border-[#333] font-mono text-sm overflow-x-auto h-fit"
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                            >
                                <div className="text-gray-500 mb-2">// HSL Color Generation Logic</div>
                                <pre><code style={{ color: '#d4d4d4' }}>
                                    <span style={{ color: '#569cd6' }}>const</span> getColor = (<span style={{ color: '#9cdcfe' }}>value</span>: <span style={{ color: '#4ec9b0' }}>number</span>) =&gt; {'{'}<br />
                                    {'  '} <span style={{ color: '#6a9955' }}>// Clamp value between 0 and 1</span><br />
                                    {'  '} <span style={{ color: '#569cd6' }}>const</span> clamp = <span style={{ color: '#dcdcaa' }}>Math</span>.max(0, <span style={{ color: '#dcdcaa' }}>Math</span>.min(1, value));<br />
                                    {'  '}<br />
                                    {'  '} <span style={{ color: '#6a9955' }}>// Return interpolated HSL string</span><br />
                                    {'  '} <span style={{ color: '#c586c0' }}>return</span> d3.<span style={{ color: '#dcdcaa' }}>interpolateOranges</span>(clamp);<br />
                                    {'}'};
                                </code></pre>
                            </motion.div>
                        </div>
                    </div>
                </section>
            </main>
        </PageTransition>
    );
}
