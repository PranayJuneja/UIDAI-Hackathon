"use client";

import { motion } from "framer-motion";
import { Database, Server, Cpu, Box, Code2 } from "lucide-react";
import styles from "./Home.module.css";

export default function TechStackSection() {
    const stack = [
        { name: "Next.js 16", icon: <GlobeIcon />, desc: "Server Components & App Router" },
        { name: "FastAPI", icon: <Server size={24} />, desc: "Async Python Backend" },
        { name: "Polars", icon: <Database size={24} />, desc: "Rust-based DataFrame Engine" },
        { name: "Amazon Chronos", icon: <Cpu size={24} />, desc: "Foundation Forecasting Model" },
        { name: "D3.js", icon: <Box size={24} />, desc: "60fps Vector Visualization" },
        { name: "TypeScript", icon: <Code2 size={24} />, desc: "Strict Type Safety" },
    ];

    return (
        <section className={styles.section} id="tech-stack">
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>The Engine Room</h2>
                    <p className={styles.heroSubtitle}>Built on a modern, high-performance stack.</p>
                </div>

                <div className={styles.statsGrid} style={{ borderTop: 'none', paddingTop: 0 }}>
                    {stack.map((tech, i) => (
                        <motion.div
                            key={i}
                            className={styles.vectorCard}
                            style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5, borderColor: 'var(--brand-primary)' }}
                        >
                            <div
                                style={{
                                    width: '60px', height: '60px', borderRadius: '16px',
                                    background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--brand-primary)', marginBottom: '0.5rem'
                                }}
                            >
                                {tech.icon}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>{tech.name}</h3>
                                <p style={{ color: '#888', fontSize: '0.9rem' }}>{tech.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function GlobeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
    );
}
