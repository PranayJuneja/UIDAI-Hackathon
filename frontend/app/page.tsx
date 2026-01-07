"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  Map,
  Search,
  Cpu,
  Layers,
  ArrowRight,
  Zap,
  Globe2,
  Sparkles,
  Database,
  Server,
  Code2,
  BrainCircuit
} from "lucide-react";
import styles from "./page.module.css";

// Generate random particles for ambient effect
interface Particle {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
}

export default function Home() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 20,
      delay: Math.random() * 10,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <main className={styles.main}>
      {/* Ambient Background Elements */}
      <div className={styles.ambientGlow} />
      <div className={styles.gridOverlay} />

      {/* Floating Particles */}
      <div className={styles.particlesContainer}>
        {particles.map((p) => (
          <span
            key={p.id}
            className={styles.particle}
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <motion.div
            className={styles.logo}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.logoIcon}>
              <Activity size={24} />
            </div>
            <span className={styles.logoText}>Chronos-X</span>
          </motion.div>

          <motion.nav
            className={styles.nav}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#tech" className={styles.navLink}>Architecture</a>
            <a href="https://github.com/PranayJuneja/UIDAI-Hackathon" target="_blank" rel="noopener noreferrer" className={styles.navLink}>GitHub</a>
          </motion.nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          style={{ y }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            className={styles.badge}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className={styles.badgeIcon}>🏆</span>
            UIDAI Hackathon 2026 &bull; The Liquid Glass Release
          </motion.div>

          <h1 className={styles.heroTitle}>
            Temporal Spatial<br />
            <span className={styles.gradientText}>Intelligence</span>
          </h1>

          <p className={styles.heroSubtitle}>
            A centralized nervous system for Aadhaar operations.
            Synthesizing <strong>Biometric</strong>, <strong>Demographic</strong>, and <strong>Enrolment</strong> signals
            to predict migration trends 3 months in advance.
          </p>

          <div className={styles.heroActions}>
            <Link href="/dashboard">
              <motion.button
                className={`${styles.btn} ${styles.btnPrimary}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={styles.btnGlow} />
                <Map size={20} />
                Explore Dashboard
              </motion.button>
            </Link>
            <motion.button
              className={`${styles.btn} ${styles.btnSecondary}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '#tech'}
            >
              <Cpu size={20} />
              View Architecture
            </motion.button>
          </div>
        </motion.div>

        {/* Hero Stats */}
        <motion.div
          className={styles.statsRow}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {[
            { label: "Data Points", value: "74k+", icon: <Database size={16} /> },
            { label: "PIN Codes", value: "19,079", icon: <Map size={16} /> },
            { label: "Forecast Horizon", value: "6 Months", icon: <Activity size={16} /> },
            { label: "Confidence", value: "99.9%", icon: <Zap size={16} /> },
          ].map((stat, i) => (
            <div key={i} className={styles.statItem}>
              <div className={styles.statIcon}>{stat.icon}</div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Feature Section: Pulse Vector */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>The Pulse Vector</h2>
          <p className={styles.sectionDesc}>
            We don't just count transactions. We measure the <span className={styles.highlight}>heartbeat</span> of every district.
          </p>
        </div>

        <div className={styles.pulseGrid}>
          {[
            {
              title: "Growth Signal",
              desc: "Tracks new family settlements tracking 0-5 age enrolments.",
              icon: <Sparkles size={32} />,
              color: "var(--color-growth)",
              gradient: "var(--gradient-growth)"
            },
            {
              title: "Flow Signal",
              desc: "Monitors urbanization drifts via demographic address updates.",
              icon: <Activity size={32} />,
              color: "var(--color-flow)",
              gradient: "var(--gradient-flow)"
            },
            {
              title: "Labor Signal",
              desc: "Detects workforce shifts using high-frequency biometric auth.",
              icon: <Layers size={32} />,
              color: "var(--color-labor)",
              gradient: "var(--gradient-labor)"
            }
          ].map((signal, i) => (
            <motion.div
              key={i}
              className={styles.pulseCard}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={styles.pulseIcon} style={{ color: signal.color }}>
                {signal.icon}
              </div>
              <h3 className={styles.pulseTitle}>{signal.title}</h3>
              <p className={styles.pulseDesc}>{signal.desc}</p>
              <div className={styles.pulseBar}>
                <div
                  className={styles.pulseFill}
                  style={{ background: signal.gradient, width: `${60 + i * 15}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature Section: Spatial Search */}
      <section className={`${styles.section} ${styles.altSection}`}>
        <div className={styles.featureSplit}>
          <motion.div
            className={styles.featureText}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className={styles.tag}>Algorithmic Innovation</div>
            <h2>Spatial Parallel Search</h2>
            <p>
              Traditional time-series models fail with sparse data. Chronos-X invents a new way to forecast: <strong>Behavioral Cloning</strong>.
            </p>
            <ul className={styles.featureList}>
              <li>
                <Search size={18} />
                <span>Scans 19,000+ PIN codes instantly</span>
              </li>
              <li>
                <Globe2 size={18} />
                <span>Finds "Parallel Universes" in other states</span>
              </li>
              <li>
                <BrainCircuit size={18} />
                <span>Clones future trajectories to fill data gaps</span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            className={styles.featureVisual}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className={styles.codeWindow}>
              <div className={styles.codeHeader}>
                <div className={styles.dots}><span /><span /><span /></div>
                <span>spatial_search.py</span>
              </div>
              <pre className={styles.codeBlock}>
                <code>
                  {`def find_parallels(target_pin):
  # 1. Vectorize Target Behavior
  vec_t = encode(target_pin.history)
  
  # 2. Parallel Search
  matches = kNN(vec_t, k=3)
  
  # 3. Clone Trajectories
  return [m.future for m in matches]`}
                </code>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Section: Copilot */}
      <section className={styles.section}>
        <div className={styles.featureSplitReverse}>
          <motion.div
            className={styles.featureVisual}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className={styles.chatPreview}>
              <div className={styles.chatBubble}>
                <span className={styles.chatUser}>UidaiOfficial</span>
                <p>Why is labor growing in Bihar?</p>
              </div>
              <div className={`${styles.chatBubble} ${styles.chatBot}`}>
                <div className={styles.botHeader}>
                  <Sparkles size={14} /> Chronos Copilot
                </div>
                <p>Detecting <strong>Kharif Harvest</strong> return migration.
                  Spatial parallels with 2024 patterns in UP suggest a
                  <strong>15% surge</strong> in biometric updates next month.</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={styles.featureText}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className={styles.tag}>Generative Context</div>
            <h2>Talk to the Grid</h2>
            <p>
              Don't just look at dashboards. Ask them questions. The <strong>Chronos Copilot</strong> explains *why* the metrics are moving.
            </p>
            <ul className={styles.featureList}>
              <li>
                <Zap size={18} />
                <span>Real-time Contextual Attestation</span>
              </li>
              <li>
                <Map size={18} />
                <span>Natural Language Location Resolution</span>
              </li>
            </ul>
            <Link href="/dashboard">
              <button className={`${styles.btn} ${styles.btnGhost}`}>
                Try Copilot <ArrowRight size={16} />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>The Engine Room</h2>
          <p className={styles.sectionDesc}>Built on a modern, high-performance stack.</p>
        </div>

        <div className={styles.techGrid}>
          {[
            { name: "Next.js 16", icon: <Globe2 />, desc: "Server Components & App Router" },
            { name: "FastAPI", icon: <Zap />, desc: "Async Python Backend" },
            { name: "Polars", icon: <Database />, desc: "Rust-based DataFrame Engine" },
            { name: "Amazon Chronos", icon: <BrainCircuit />, desc: "Foundation Forecasting Model" },
            { name: "D3.js", icon: <Map />, desc: "60fps Vector Visualization" },
            { name: "TypeScript", icon: <Code2 />, desc: "Strict Type Safety" },
          ].map((tech, i) => (
            <motion.div
              key={i}
              className={styles.techCard}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className={styles.techIcon}>{tech.icon}</div>
              <h3 className={styles.techName}>{tech.name}</h3>
              <p className={styles.techDesc}>{tech.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <Activity className={styles.footerLogo} size={24} />
            <span>Chronos-X</span>
          </div>
          <p className={styles.footerCredit}>
            Engineered for <strong style={{ color: 'white' }}>UIDAI Hackathon 2026</strong> <br />
            Project ID: <span className={styles.mono}>UIDAI-HACK-2026-CHRONOS</span>
          </p>
          <div className={styles.footerLinks}>
            <a href="#">Documentation</a>
            <a href="#">API Reference</a>
            <a href="#">License</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
