"use client";

import { motion } from "framer-motion";
import styles from "./Home.module.css";
import { Server, Database, Globe, Cpu, ShieldCheck } from "lucide-react";

export default function SystemArchitectureSection() {
    return (
        <section className={styles.section} style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(124, 58, 237, 0.05) 50%, rgba(0,0,0,0) 100%)' }}>
            <div className={styles.container}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={styles.sectionHeader}
                >
                    <div className={styles.sectionBadge}><Server size={14} /> SYSTEM ARCHITECTURE</div>
                    <h2 className={styles.sectionTitle}>The Chronos-X Engine</h2>
                    <p className={styles.sectionSubtitle}>
                        A microservices architecture orchestrating <span className="text-[#A78BFA]">Amazon Chronos T5</span>, <span className="text-[#FBBF24]">Polars</span>, and <span className="text-[#34D399]">Next.js 16</span>.
                    </p>
                </motion.div>

                <div className={styles.architectureGrid}>
                    {/* Connector Lines (Desktop only) */}
                    <div className={styles.connectorLine} />

                    {/* Node 1: Ingestion */}
                    <motion.div
                        className="vector-card z-10 bg-[#0f0f11] border border-[#333] p-6 rounded-2xl"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 border border-blue-500/20">
                            <Database className="text-blue-500" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Data Ingestion</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Raw UIDAI logs are processed via <code>ChronosDataEngine</code>.
                        </p>
                        <ul className="text-xs space-y-2 text-gray-500 font-mono">
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-500 rounded-full" />Parquet Compression (Snappy)</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-500 rounded-full" />Zero-Copy Arrow Memory</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-500 rounded-full" />Polars Lazy Execution</li>
                        </ul>
                    </motion.div>

                    {/* Node 2: Intelligence */}
                    <motion.div
                        className={`${styles.vectorCard} z-10 bg-[#0f0f11] border border-[#A78BFA] shadow-[0_0_30px_rgba(167,139,250,0.1)] transform md:-translate-y-4`}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 border border-purple-500/20">
                            <Cpu className="text-purple-500" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">Hybrid Predictor</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Ensemble model combining AI forecasting & spatial search.
                        </p>
                        <div className="bg-[#1a1a1c] p-3 rounded-lg border border-white/5 font-mono text-[10px] text-gray-400 mb-2">
                            def predict(pin):<br />
                            &nbsp;&nbsp;ai = chronos_t5.forecast(pin)<br />
                            &nbsp;&nbsp;spatial = knn_search(pin)<br />
                            &nbsp;&nbsp;return weighted_avg(ai, spatial)
                        </div>
                    </motion.div>

                    {/* Node 3: Delivery */}
                    <motion.div
                        className="vector-card z-10 bg-[#0f0f11] border border-[#333] p-6 rounded-2xl"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 border border-emerald-500/20">
                            <Globe className="text-emerald-500" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Context Delivery</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Real-time insights served via WebSocket & D3.js.
                        </p>
                        <ul className="text-xs space-y-2 text-gray-500 font-mono">
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" />ContextEngine Injection</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" />LocationResolver (Fuzzy)</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" />React Server Components</li>
                        </ul>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
