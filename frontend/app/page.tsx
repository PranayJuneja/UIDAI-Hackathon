"use client";

import HeroSection from "./components/Home/HeroSection";
import PulseVectorSection from "./components/Home/PulseVectorSection";
import MethodologySection from "./components/Home/MethodologySection";
import TechStackSection from "./components/Home/TechStackSection";
import SystemArchitectureSection from "./components/Home/SystemArchitectureSection";
import { PageLayout } from "./components/UI";
import { Activity } from "lucide-react";

export default function Home() {
  return (
    <PageLayout>
      <HeroSection />
      <SystemArchitectureSection />
      <PulseVectorSection />
      <MethodologySection />
      <TechStackSection />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '4rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        marginTop: '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem', opacity: 0.9 }}>
          <Activity size={24} className="text-[#A78BFA]" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.2rem', background: 'linear-gradient(90deg, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Chronos-X</span>
        </div>

        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <a href="/backend" className="hover:text-white transition-colors">Backend Architecture</a>
          <a href="/ml" className="hover:text-white transition-colors">AI &amp; Forecasting</a>
          <a href="/visualization" className="hover:text-white transition-colors">Visualization Logic</a>
          <a href="/frontend" className="hover:text-white transition-colors">Frontend UX</a>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.6' }}>
          Engineered for <strong style={{ color: 'var(--text-primary)' }}>UIDAI Hackathon 2026</strong><br />
          Team Antigravity • Project ID: <span className="font-mono text-[#4DB6AC]">UIDAI-HACK-2026-CHRONOS</span>
        </p>
      </footer>
    </PageLayout>
  );
}
