"use client";

import { motion } from "framer-motion";
import { PageLayout, SubPageHero } from "../components/UI";
import styles from "../components/Home/Home.module.css";
import { Database, Server, Cpu, Box, Terminal as TerminalIcon, GitMerge, FileCode } from "lucide-react";

export default function BackendPage() {
    return (
        <PageLayout showParticles={true} showAurora={false}>
            <SubPageHero
                title="The Backend Engine"
                subtitle={<>A high-performance orchestration layer transforming raw UIDAI logs into actionable intelligence.</>}
                badge="SYSTEM ARCHITECTURE"
                icon={Server}
            />

            <section className={styles.section}>
                <div className={styles.container}>

                    {/* Section 1: Data Engine */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
                        <motion.div className={styles.contentCard} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                            <div className="flex items-center gap-3 mb-6">
                                <Database className="text-[#00f0ff]" size={28} />
                                <h2 className="text-3xl font-bold">Singleton Data Engine</h2>
                            </div>
                            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                The <span className="text-[#00f0ff] font-mono">ChronosDataEngine</span> class (api_server.py:236) uses a Singleton pattern to maintain the aggregated state in memory. By leveraging <strong>Polars' Lazy API</strong>, we optimize query plans before execution, ensuring sub-millisecond aggregation times even on millions of rows.
                            </p>

                            <ul className="space-y-6">
                                {[
                                    { icon: <GitMerge className="text-[#FBBF24]" />, title: "Zero-Copy Arrow Memory", desc: "Data stays in Apache Arrow format from disk to response buffer, eliminating serialization overhead." },
                                    { icon: <Cpu className="text-[#A78BFA]" />, title: "Lazy Execution Strategy", desc: "Query optimizer pushes down predicates and filters before reading full dataset." },
                                    { icon: <Box className="text-[#34D399]" />, title: "Parquet Compression", desc: "500MB CSVs → 45MB Snappy-compressed Parquet with dictionary encoding." },
                                ].map((item, i) => (
                                    <li key={i} className="flex gap-4">
                                        <div className="p-3 bg-white/5 rounded-xl h-fit border border-white/5">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                                            <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
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
                                <pre><code style={{ color: '#d4d4d4' }}>{`def aggregate_by_state(self, month):
  # 1. Lazy Scan & Filter
  df = self.pulse_vectors.filter(
      pl.col("month") == month_val
  )
  
  # 2. Parallel GroupBy (Rust Backend)
  state_agg = df.group_by("state").agg([
      pl.col("growth_norm").mean(),
      pl.col("flow_norm").mean(),
      pl.col("labor_norm").mean()
  ])
  
  # 3. zero-copy collect() to PyArrow
  return [StateAggregation(**row) 
          for row in state_agg.iter_rows()]`}</code></pre>
                            </div>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <motion.div
                            className={styles.terminalBoot}
                            style={{ width: '100%', height: 'fit-content' }}
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div className={styles.terminalHeader}>
                                <TerminalIcon size={16} />
                                <span>src/ai_forecaster.py: AIForecaster.forecast_pin</span>
                            </div>
                            <div className={styles.terminalBody}>
                                <pre><code style={{ color: '#d4d4d4' }}>{`def forecast_pin(self, history, samples=20):
  torch = _get_torch()
  
  # 1. Convert to Tensor
  context = torch.tensor(history, 
                         dtype=torch.float32)
  
  # 2. Chronos T5 Inference
  forecast = self.pipeline.predict(
      context, horizon=6, 
      num_samples=samples
  )
  
  # 3. Extract Uncertainty Quantiles
  low, median, high = np.quantile(
      forecast[0].numpy(), 
      [0.1, 0.5, 0.9], axis=0
  )
  
  return { "median": median.tolist(), ... }`}</code></pre>
                            </div>
                        </motion.div>

                        <motion.div className={styles.contentCard} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                            <div className="flex items-center gap-3 mb-6">
                                <FileCode className="text-[#bd00ff]" size={28} />
                                <h2 className="text-3xl font-bold">The AI Forecaster</h2>
                            </div>
                            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                The <span className="text-[#bd00ff] font-mono">AIForecaster</span> class (src/ai_forecaster.py:56) wraps the <strong>Amazon Chronos T5</strong> foundation model. Since Chronos is pre-trained on millions of time series, it can perform <em>Zero-Shot Forecasting</em> even with our limited 2-month hackathon dataset.
                            </p>
                            <ul className="space-y-4 text-sm text-gray-500 font-mono">
                                <li className="flex items-center gap-3">
                                    <span className="text-[#bd00ff] font-bold">Input:</span>
                                    torch.tensor([Nov_val, Dec_val])
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="text-[#bd00ff] font-bold">Output:</span>
                                    Quantiles [0.1, 0.5, 0.9] for uncertainty bounds
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="text-[#bd00ff] font-bold">Horizon:</span>
                                    Flexible (tuned to 6 months)
                                </li>
                            </ul>

                            <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <h4 className="text-yellow-500 font-bold mb-1 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                    Hybrid Ensemble
                                </h4>
                                <p className="text-gray-400 text-sm">
                                    We don't trust AI blindly. The <code>HybridPredictor</code> class blends T5 predictions with <strong>Spatial Parallel Search</strong> (Cosine Similarity) results.
                                    <br /><code className="text-xs bg-black/30 p-1 rounded mt-2 block w-fit">Final = w1 * AI_Forecast + w2 * Parallel_Outcome</code>
                                </p>
                            </div>
                        </motion.div>
                    </div>

                </div>
            </section>

            <section className={styles.section} style={{ background: 'var(--bg-surface)' }}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>FastAPI Orchestrator</h2>
                        <p className={styles.heroSubtitle}>Connecting the AI brain to the frontend interface.</p>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.vectorCard} style={{ display: 'block', textAlign: 'left' }}>
                            <h3 className="font-display font-bold text-2xl mb-4 text-[#8AB4F8]">WebSocket Protocol</h3>
                            <p className="text-secondary mb-4">
                                Real-time bidirectional communication for the Chronos Copilot.
                            </p>
                            <code className="bg-black/50 p-4 block rounded-lg text-yellow-500 font-mono text-xs">
                                ws://api/chat<br />
                                {`-> { "query": "Analysis for Mumbai" }`}<br />
                                {`<- { "type": "token", "content": "..." }`}
                            </code>
                        </div>

                        <div className={styles.vectorCard} style={{ display: 'block', textAlign: 'left' }}>
                            <h3 className="font-display font-bold text-2xl mb-4 text-[#FBBF24]">Context Injection</h3>
                            <p className="text-secondary mb-4">
                                Dynamically injecting seasonality data (Rabi/Kharif harvests) via <code>ContextEngine</code>.
                            </p>
                            <code className="bg-black/50 p-4 block rounded-lg text-purple-400 font-mono text-xs">
                                {`Prompt += "Season: Rabi Harvest..."`}
                            </code>
                        </div>

                        <div className={styles.vectorCard} style={{ display: 'block', textAlign: 'left' }}>
                            <h3 className="font-display font-bold text-2xl mb-4 text-[#34D399]">Geo-Resolver</h3>
                            <p className="text-secondary mb-4">
                                Fuzzy logic engine converting "Banglore" to "560xxx" using <code>SequenceMatcher</code>.
                            </p>
                            <code className="bg-black/50 p-4 block rounded-lg text-teal-400 font-mono text-xs">
                                {`difflib.SequenceMatcher(query, city)`}
                            </code>
                        </div>
                    </div>
                </div>
            </section>

        </PageLayout>
    );
}
