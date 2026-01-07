"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
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
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
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
            <a href="#signals" className={styles.navLink}>Insights</a>
            <a href="#about" className={styles.navLink}>About</a>
          </motion.nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.span
            className={styles.badge}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            🏆 UIDAI Hackathon 2026
          </motion.span>

          <h1 className={styles.heroTitle}>
            The Weather Forecast<br />
            <span className={styles.gradient}>for Aadhaar</span>
          </h1>

          <p className={styles.heroSubtitle}>
            AI-powered demand forecasting that predicts Migration, Settlement,
            and Labor Trends 1-3 months in advance across 19,000+ PIN codes.
          </p>

          <div className={styles.heroActions}>
            <Link href="/dashboard">
              <motion.button
                className="btn btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🗺️ Explore Dashboard
              </motion.button>
            </Link>
            <motion.button
              className="btn btn-secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View Documentation
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          className={styles.statsRow}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className={styles.stat}>
            <span className={styles.statValue}>74,829</span>
            <span className={styles.statLabel}>Data Rows</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>19,079</span>
            <span className={styles.statLabel}>PIN Codes</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>36</span>
            <span className={styles.statLabel}>States & UTs</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>99.99%</span>
            <span className={styles.statLabel}>Confidence</span>
          </div>
        </motion.div>
      </section>

      {/* Signal Cards */}
      <section className={styles.signals}>
        <motion.h2
          className={styles.sectionTitle}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          The Pulse Vector
        </motion.h2>
        <p className={styles.sectionSubtitle}>
          Three signals that capture the DNA of every PIN code
        </p>

        <div className={styles.signalCards}>
          {/* Growth Signal */}
          <motion.div
            className={`${styles.signalCard} ${styles.growthCard}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.signalIcon}>👶</div>
            <h3 className={styles.signalTitle}>Growth Signal</h3>
            <p className={styles.signalDesc}>
              New family settlements tracked through 0-5 age child enrollments
            </p>
            <div className={styles.signalBar}>
              <motion.div
                className={styles.signalFill}
                style={{ background: "var(--gradient-growth)" }}
                initial={{ width: 0 }}
                whileInView={{ width: "65%" }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 1 }}
              />
            </div>
          </motion.div>

          {/* Flow Signal */}
          <motion.div
            className={`${styles.signalCard} ${styles.flowCard}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.signalIcon}>🚶</div>
            <h3 className={styles.signalTitle}>Flow Signal</h3>
            <p className={styles.signalDesc}>
              Migration and urbanization patterns from demographic updates
            </p>
            <div className={styles.signalBar}>
              <motion.div
                className={styles.signalFill}
                style={{ background: "var(--gradient-flow)" }}
                initial={{ width: 0 }}
                whileInView={{ width: "78%" }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 1 }}
              />
            </div>
          </motion.div>

          {/* Labor Signal */}
          <motion.div
            className={`${styles.signalCard} ${styles.laborCard}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.signalIcon}>💪</div>
            <h3 className={styles.signalTitle}>Labor Signal</h3>
            <p className={styles.signalDesc}>
              Manual labor intensity measured through biometric updates
            </p>
            <div className={styles.signalBar}>
              <motion.div
                className={styles.signalFill}
                style={{ background: "var(--gradient-labor)" }}
                initial={{ width: 0 }}
                whileInView={{ width: "52%" }}
                viewport={{ once: true }}
                transition={{ delay: 0.7, duration: 1 }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className={styles.dashboardPreview} id="dashboard">
        <motion.div
          className={styles.previewCard}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className={styles.previewHeader}>
            <div className={styles.previewDots}>
              <span></span><span></span><span></span>
            </div>
            <span className={styles.previewTitle}>Chronos-X Dashboard</span>
          </div>
          <div className={styles.previewContent}>
            <div className={styles.mapPlaceholder}>
              <div className={styles.mapGradient}></div>
              <span>🗺️ Interactive India Map</span>
              <p>Coming Soon</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>Built with ❤️ by Team Chronos-X</p>
          <p className={styles.footerMuted}>UIDAI Hackathon 2026</p>
        </div>
      </footer>
    </main>
  );
}
