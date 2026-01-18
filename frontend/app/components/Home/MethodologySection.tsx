"use client";

import { motion } from "framer-motion";
import { Search, Globe2, BrainCircuit, Code, GitBranch } from "lucide-react";
import styles from "./Home.module.css";

export default function MethodologySection() {
    return (
        <section className={styles.section} style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <div className={styles.heroBadge} style={{ marginBottom: '1rem' }}>
                        <BrainCircuit size={14} />
                        <span>ALGORITHMIC INNOVATION</span>
                    </div>
                    <h2 className={styles.sectionTitle}>Spatial Parallel Search</h2>
                    <p className={styles.heroSubtitle}>
                        Traditional models fail on sparse data. We invented <span className={styles.gradientText}>Behavioral Cloning</span> for demographics.
                    </p>
                </div>

                <div className={styles.pulseContainer} style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                    {/* Left: Code Window */}
                    <motion.div
                        className={styles.terminalBoot}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className={styles.terminalHeader}>
                            <Code size={14} />
                            <span>core/spatial_engine.py</span>
                        </div>
                        <div className={styles.terminalBody}>
                            <pre style={{ margin: 0 }}>
                                <code style={{ color: '#d4d4d4' }}>
                                    <span style={{ color: '#c586c0' }}>def</span> <span style={{ color: '#dcdcaa' }}>find_parallels</span>(target_pin):{"\n"}
                                    {"  "}
                                    <span style={{ color: '#6a9955' }}># 1. Vectorize Target Behavior</span>{"\n"}
                                    {"  "}vec_t = encode(target_pin.history){"\n"}
                                    {"  "}{"\n"}
                                    {"  "}
                                    <span style={{ color: '#6a9955' }}># 2. Search Universal Database (19k+ PINs)</span>{"\n"}
                                    {"  "}matches = kNN(vec_t, k=3, metric=<span style={{ color: '#ce9178' }}>'cosine'</span>){"\n"}
                                    {"  "}{"\n"}
                                    {"  "}
                                    <span style={{ color: '#6a9955' }}># 3. Clone Future Trajectories</span>{"\n"}
                                    {"  "}
                                    <span style={{ color: '#c586c0' }}>return</span> [m.future <span style={{ color: '#c586c0' }}>for</span> m in matches]
                                </code>
                            </pre>
                        </div>
                        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Execution Time: 42ms</span>
                            <span>Threads: 8</span>
                        </div>
                    </motion.div>

                    {/* Right: Explanation */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                            The "Time Machine" Logic
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {[
                                {
                                    icon: <Search size={20} />,
                                    title: "Pattern Matching",
                                    text: "Scans 19,000+ PIN codes instantly to find regions with identical growth patterns to your target."
                                },
                                {
                                    icon: <Globe2 size={20} />,
                                    title: "Parallel Universes",
                                    text: "Finds a suburb in Bangalore that behaves exactly like your target in Pune did 6 months ago."
                                },
                                {
                                    icon: <GitBranch size={20} />,
                                    title: "Trajectory Cloning",
                                    text: "Projections are not just mathematical guesses. They are cloned from the actual futures of parallel regions."
                                }
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{
                                        minWidth: '40px', height: '40px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--brand-primary)'
                                    }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>{item.title}</h4>
                                        <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.5 }}>{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
