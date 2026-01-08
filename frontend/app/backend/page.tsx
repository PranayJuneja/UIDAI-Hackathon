"use client";

import { motion } from "framer-motion";
import SiteHeader from "../components/SiteHeader";
import styles from "../components/Home/Home.module.css";
import { Database, Server, Cpu, Box, Terminal as TerminalIcon } from "lucide-react";

export default function BackendPage() {
    return (
        <main className="min-h-screen bg-[#1c1b1f] text-white">
            <div className="aurora" />
            <div className="gridOverlay" />
            <SiteHeader />

            <section className={styles.heroSection} style={{ minHeight: '60vh', paddingBottom: 0 }}>
                <motion.div className={styles.heroContent} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={styles.heroBadge}><Server size={14} /> SYSTEM ARCHITECTURE</div>
                    <h1 className={styles.heroTitle}>The Backend Engine</h1>
                    <p className={styles.heroSubtitle}>
                        A high-performance orchestration layer transforming raw UIDAI logs into actionable intelligence in milliseconds.
                    </p>
                </motion.div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.pulseContainer} style={{ gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>

                        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                            <h2 className={styles.sectionTitle} style={{ textAlign: 'left', fontSize: '2.5rem' }}>
                                Singleton Data Engine
                            </h2>
                            <p className={styles.heroSubtitle} style={{ textAlign: 'left', marginLeft: 0 }}>
                                The <span className="text-[#4DB6AC]">ChronosDataEngine</span> class (api_server.py:236) uses a Singleton pattern to hold the aggregated state in memory.
                            </p>

                            <ul style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
                                {[
                                    { icon: <Database />, title: "Zero-Copy Arrow Memory", desc: "Data stays in Apache Arrow format from disk to response." },
                                    { icon: <Cpu />, title: "Lazy Execution Strategy", desc: "Query plans are optimized before a single byte is read." },
                                    { icon: <Box />, title: "Parquet Compression", desc: "500MB CSVs → 45MB Snappy-compressed Parquet." },
                                ].map((item, i) => (
                                    <li key={i} style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', height: 'fit-content' }}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>{item.title}</h4>
                                            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>{item.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        <motion.div
                            className={styles.terminalBoot}
                            style={{ width: '100%', height: 'fit-content' }}
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className={styles.terminalHeader}>
                                <TerminalIcon size={16} />
                                <span>api_server.py: ChronosDataEngine.aggregate_by_state</span>
                            </div>
                            <div className={styles.terminalBody}>
                                <pre><code style={{ color: '#d4d4d4' }}>
                                    <span style={{ color: '#c586c0' }}>def</span> <span style={{ color: '#dcdcaa' }}>aggregate_by_state</span>(self, month):
                                    {"  "}
                                    <span style={{ color: '#6a9955' }}># 1. Filter LazyFrame</span>
                                    {"  "}df = self.pulse_vectors.filter(
                                    {"      "}pl.col(<span style={{ color: '#ce9178' }}>"month"</span>) == month_val
                                    {"  "})
                                    {"  "}
                                    <span style={{ color: '#6a9955' }}># 2. Parallel GroupBy</span>
                                    {"  "}state_agg = df.group_by(<span style={{ color: '#ce9178' }}>"state"</span>).agg([
                                    {"      "}pl.col(<span style={{ color: '#ce9178' }}>"growth_norm"</span>).mean(),
                                    {"      "}pl.col(<span style={{ color: '#ce9178' }}>"flow_norm"</span>).mean(),
                                    {"      "}pl.col(<span style={{ color: '#ce9178' }}>"labor_norm"</span>).mean()
                                    {"  "}])
                                    {"  "}
                                    <span style={{ color: '#6a9955' }}># 3. zero-copy collect() to PyArrow</span>
                                    {"  "}return [StateAggregation(**row) for row in state_agg.iter_rows()]
                                </code></pre>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </section>

            <section className={styles.section} style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>FastAPI Orchestrator</h2>
                        <p className={styles.heroSubtitle}>Connecting the AI brain to the frontend interface.</p>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.vectorCard} style={{ display: 'block', textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#8AB4F8' }}>WebSocket Protocol</h3>
                            <p style={{ color: '#aaa', marginBottom: '1rem' }}>
                                Real-time bidirectional communication for the Chronos Copilot.
                            </p>
                            <code style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', display: 'block', borderRadius: '8px', color: '#FBBF24', fontSize: '0.8rem' }}>
                                ws://api/chat<br />
                                {`-> { "query": "Analysis for Mumbai" }`}<br />
                                {`<- { "type": "token", "content": "..." }`}
                            </code>
                        </div>

                        <div className={styles.vectorCard} style={{ display: 'block', textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#FBBF24' }}>Context Injection</h3>
                            <p style={{ color: '#aaa', marginBottom: '1rem' }}>
                                Dynamically injecting seasonality data into LLM prompts.
                            </p>
                            <code style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', display: 'block', borderRadius: '8px', color: '#A78BFA', fontSize: '0.8rem' }}>
                                {`Prompt: "Given [Harvest Season] in [Punjab]..."`}
                            </code>
                        </div>

                        <div className={styles.vectorCard} style={{ display: 'block', textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#34D399' }}>Geo-Resolver</h3>
                            <p style={{ color: '#aaa', marginBottom: '1rem' }}>
                                Fuzzy logic engine converting "Banglore" to "560xxx".
                            </p>
                            <code style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', display: 'block', borderRadius: '8px', color: '#34D399', fontSize: '0.8rem' }}>
                                {`match("Banglore") -> "Bangalore" (98%)`}
                            </code>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
}
