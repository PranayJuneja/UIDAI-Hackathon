"use client";

import { motion } from "framer-motion";
import { PageLayout, SubPageHero } from "../components/UI";
import styles from "../components/Home/Home.module.css";
import { BrainCircuit, MapPin, MessageSquare, Zap, Terminal as TerminalIcon } from "lucide-react";

export default function MLPage() {
    return (
        <PageLayout showParticles={true}>
            <SubPageHero
                title="The Intelligence Layer"
                subtitle={<>Zero-shot time series prediction using <span className="text-[#F43F5E]">Amazon Chronos</span> and our proprietary <span className="text-[#A78BFA]">Spatial Parallel Search</span>.</>}
                badge="ARTIFICIAL INTELLIGENCE"
                icon={BrainCircuit}
            />

            <section className={styles.section}>
                <div className={styles.container}>

                    {/* Section 1: Spatial Parallel Search */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
                        <motion.div className={styles.contentCard} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                            <h2 className="text-3xl font-bold mb-6">Spatial Parallel Search</h2>
                            <p className="text-gray-400 text-lg mb-6">
                                With limited temporal data, we cannot rely solely on historical regression. Our insight: <strong>Space can substitute for Time.</strong>
                            </p>
                            <p className="text-gray-400 text-lg mb-8">
                                If Region A (Target) matches Region B (Source) in November, then Region B's December outcome is a strong predictor for Region A's future.
                            </p>

                            <div className={styles.vectorCard}>
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <MapPin size={18} className="text-[#A78BFA]" />
                                    Algorithm: find_spatial_parallels
                                </h3>
                                <ol className="list-decimal pl-5 space-y-4 text-gray-400 text-sm">
                                    <li>
                                        <strong>Vectorization:</strong> Convert target PIN's history into a 3D Pulse Vector <code>[Growth, Flow, Labor]</code>.
                                    </li>
                                    <li>
                                        <strong>KNN Search:</strong> Scan 19,000+ PINs to find "Parallel Universes" using Cosine Similarity.
                                    </li>
                                    <li>
                                        <strong>Trajectory Cloning:</strong> Project the future trajectory of the top-k parallels onto the target.
                                    </li>
                                </ol>
                            </div>
                        </motion.div>

                        <div className="h-full flex items-center justify-center">
                            <div className="relative w-full aspect-square max-w-[400px]">
                                {/* Abstract Visualization of Vectors */}
                                <div className="absolute inset-0 border border-white/10 rounded-full animate-[spin_20s_linear_infinite]" />
                                <div className="absolute inset-12 border border-blue-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                                <div className="absolute inset-24 border border-purple-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-white mb-2">cos(θ)</div>
                                        <div className="text-sm text-gray-500">Vector Similarity</div>
                                    </div>
                                </div>
                                {/* Floating Dots representing PINs */}
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="absolute w-2 h-2 bg-white rounded-full"
                                        style={{
                                            top: `${50 + 40 * Math.sin(i)}%`,
                                            left: `${50 + 40 * Math.cos(i)}%`,
                                            opacity: 0.5 + Math.abs(Math.sin(i * 100)) * 0.5
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>


                    {/* Section 2: The Chatbot Bridge & Attestor */}
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
                                <span>src/attestation.py: Attestor.chat</span>
                            </div>
                            <div className={styles.terminalBody}>
                                <pre><code style={{ color: '#d4d4d4' }}>{`def chat(self, message, context):
  # 1. Format Data Context
  data_block = self._format_context(context)
  
  # 2. Inject into System Prompt
  full_prompt = f"""
    ## Current Data Context
    {data_block}
    
    ## User Question
    {message}
  """
  
  # 3. LLM Generation
  return self.client.chat.completions.create(
      model="minimax-m2.1",
      messages=[{
        "role": "user", 
        "content": full_prompt
      }],
      temperature=0.4
  )`}</code></pre>
                            </div>
                        </motion.div>

                        <motion.div className={styles.contentCard} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                            <h2 className="text-3xl font-bold mb-6">The Attestor Engine</h2>
                            <p className="text-gray-400 text-lg mb-6">
                                The <code>Attestor</code> class (src/attestation.py) is the brain of the chatbot. It uses a specialized <strong>System Prompt</strong> to enforce a "Weather Forecast" persona.
                            </p>

                            <div className="space-y-6">
                                <div className={`${styles.vectorCard} border-l-4 border-l-[#F43F5E]`}>
                                    <h4 className="font-bold text-[#F43F5E] mb-2 flex items-center gap-2"><MessageSquare size={16} /> Intent Parsing</h4>
                                    <p className="text-sm text-gray-400 mb-2">
                                        Uses regex/LLM to extract structured intents from natural language.
                                    </p>
                                    <code className="text-xs bg-black/40 p-2 rounded block text-gray-500">
                                        "What about Delhi?" → {"{ location: 'Delhi', intent: 'forecast' }"}
                                    </code>
                                </div>

                                <div className={`${styles.vectorCard} border-l-4 border-l-[#3B82F6]`}>
                                    <h4 className="font-bold text-[#3B82F6] mb-2 flex items-center gap-2"><Zap size={16} /> Context Injection</h4>
                                    <p className="text-sm text-gray-400 mb-2">
                                        The <code>ContextEngine</code> injects seasonality drivers into the LLM prompt.
                                    </p>
                                    <code className="text-xs bg-black/40 p-2 rounded block text-gray-500">
                                        System: "It is Harvest Season in Punjab. Expect high labor movement."
                                    </code>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                </div>
            </section>
        </PageLayout>
    );
}
