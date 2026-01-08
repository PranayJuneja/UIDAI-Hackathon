"use client";

import { motion } from "framer-motion";
import SiteHeader from "../components/SiteHeader";
import styles from "../components/Home/Home.module.css";
import { Layers, Zap, Smartphone, Palette, MousePointer2, Layout } from "lucide-react";

export default function FrontendPage() {
    return (
        <main className="min-h-screen bg-[#1c1b1f] text-white">
            <div className="aurora" style={{ background: 'radial-gradient(at 80% 0%, rgba(129, 140, 248, 0.3) 0%, transparent 70%)' }} />
            <div className="gridOverlay" />
            <SiteHeader />

            <section className={styles.heroSection} style={{ minHeight: '50vh', paddingBottom: 0 }}>
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

                    {/* Section 1: Page Transitions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
                        <motion.div
                            className="bg-[#0f0f11] border border-white/10 rounded-2xl p-8 relative overflow-hidden"
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                        >
                            {/* Visual Representation of Animation */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#A78BFA] to-transparent animate-[shimmer_2s_infinite]" />
                            <div className="flex flex-col gap-4">
                                <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
                                <div className="h-32 w-full bg-white/5 rounded-lg border border-white/5" />
                                <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
                            </div>
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Layout size={18} /> PageTransition.tsx</h3>
                                <p className="text-sm text-gray-500">
                                    We use a custom wrapper with <code>AnimatePresence</code> mode="wait" to ensure exit animations complete before the new page mounts.
                                </p>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}>
                            <h2 className="text-3xl font-bold mb-6">Orchestrated Motion</h2>
                            <p className="text-gray-400 text-lg mb-6">
                                Every interaction in Chronos-X is fluid. We strictly type our transition objects to avoid runtime overhead and ensure GPU acceleration.
                            </p>
                            <div className="bg-[#1e1e1e] p-6 rounded-xl border border-[#333] font-mono text-sm overflow-x-auto">
                                <pre><code style={{ color: '#d4d4d4' }}>
                                    <span style={{ color: '#569cd6' }}>const</span> pageVariants = {'{'}<br />
                                    {'  '}initial: {'{'}<br />
                                    {'      '}opacity: <span style={{ color: '#b5cea8' }}>0</span>,<br />
                                    {'      '}y: <span style={{ color: '#b5cea8' }}>8</span>,<br />
                                    {'      '}scale: <span style={{ color: '#b5cea8' }}>0.99</span><br />
                                    {'  '}{'}'},<br />
                                    {'  '}animate: {'{'}<br />
                                    {'      '}opacity: <span style={{ color: '#b5cea8' }}>1</span>,<br />
                                    {'      '}y: <span style={{ color: '#b5cea8' }}>0</span>,<br />
                                    {'      '}scale: <span style={{ color: '#b5cea8' }}>1</span><br />
                                    {'  '}{'}'},<br />
                                    {'  '}exit: {'{'}<br />
                                    {'      '}opacity: <span style={{ color: '#b5cea8' }}>0</span>,<br />
                                    {'      '}y: <span style={{ color: '#b5cea8' }}>-8</span>,<br />
                                    {'      '}scale: <span style={{ color: '#b5cea8' }}>1.01</span><br />
                                    {'  '}{'}'}<br />
                                    {'}'};
                                </code></pre>
                            </div>
                        </motion.div>
                    </div>

                    {/* Section 2: Map Visuals */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{ direction: 'rtl' }}>
                        <motion.div style={{ direction: 'ltr' }} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}>
                            <h2 className="text-3xl font-bold mb-6">Memoized D3 Rendering</h2>
                            <p className="text-gray-400 text-lg mb-6">
                                Rendering 500+ district paths is expensive. We use <code>React.memo</code> with a custom comparator to strictly control re-renders.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <Zap className="text-yellow-400 mt-1" size={18} />
                                    <div>
                                        <strong className="text-white block">Reference Stability</strong>
                                        <span className="text-gray-500 text-sm">Projection functions and path generators are stable across renders.</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <MousePointer2 className="text-cyan-400 mt-1" size={18} />
                                    <div>
                                        <strong className="text-white block">CSS-First Hovers</strong>
                                        <span className="text-gray-500 text-sm">Hover states handled via CSS <code>:hover</code> instead of React state to bypass diffing.</span>
                                    </div>
                                </li>
                            </ul>
                        </motion.div>

                        <motion.div
                            className="bg-[#1e1e1e] p-6 rounded-xl border border-[#333] font-mono text-sm overflow-x-auto"
                            style={{ direction: 'ltr' }}
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                        >
                            <pre><code style={{ color: '#d4d4d4' }}>
                                <span style={{ color: '#569cd6' }}>const</span> MapVisuals = <span style={{ color: '#dcdcaa' }}>memo</span>(<span style={{ color: '#569cd6' }}>function</span> MapVisuals(...) {'{'}<br />
                                {'  '}<span style={{ color: '#6a9955' }}>// 1. Memoize Projection</span><br />
                                {'  '}<span style={{ color: '#569cd6' }}>const</span> projection = <span style={{ color: '#dcdcaa' }}>useMemo</span>(() =&gt; <br />
                                {'    '}d3.<span style={{ color: '#dcdcaa' }}>geoMercator</span>().<span style={{ color: '#dcdcaa' }}>center</span>([82.5, 23]).<span style={{ color: '#dcdcaa' }}>scale</span>(1250)<br />
                                {'  '}, []);<br />
                                <br />
                                {'  '}<span style={{ color: '#6a9955' }}>// 2. Render Paths Cheaply</span><br />
                                {'  '}<span style={{ color: '#569cd6' }}>return</span> geoData.features.<span style={{ color: '#dcdcaa' }}>map</span>(f =&gt; (<br />
                                {'    '}&lt;<span style={{ color: '#4ec9b0' }}>path</span> d={'{'}pathGen(f){'}'} /&gt;<br />
                                {'  '}))<br />
                                {'}, (prev, next) =&gt; {'}<br />
                                {'  '}<span style={{ color: '#6a9955' }}>// 3. Strict Equality Check</span><br />
                                {'  '}<span style={{ color: '#c586c0' }}>return</span> prev.geoData === next.geoData;<br />
                                {'});'}
                            </code></pre>
                        </motion.div>
                    </div>

                </div>
            </section>
        </main>
    );
}
