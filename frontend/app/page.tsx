"use client";

import { useEffect, useState } from "react";
import HeroSection from "./components/Home/HeroSection";
import SiteHeader from "./components/SiteHeader";
import PulseVectorSection from "./components/Home/PulseVectorSection";
import MethodologySection from "./components/Home/MethodologySection";
import TechStackSection from "./components/Home/TechStackSection";
import SystemArchitectureSection from "./components/Home/SystemArchitectureSection";
import { Activity } from "lucide-react";
import "./globals.css";
import { PageTransition } from "./components/UI";

// Generate random particles for ambient effect
interface Particle {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

export default function Home() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Client-side only to prevent hydration mismatch
    const newParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 20,
      delay: Math.random() * 10,
      color: Math.random() > 0.5 ? 'rgba(77, 182, 172, ' : 'rgba(167, 139, 250, ' // Cyan or Purple tint
    }));
    setParticles(newParticles);
  }, []);

  return (
    <PageTransition>
      <main className="min-h-screen bg-[#1C1B1F] text-white overflow-x-hidden">
        {/* Ambient Background Elements */}
        <div className="aurora" />
        <div className="gridOverlay" />

        {/* Floating Particles */}
        <div className="particlesContainer">
          {particles.map((p) => (
            <span
              key={p.id}
              className="particle"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                background: `${p.color}${Math.random() * 0.5 + 0.2})`, // Dynamic opacity
                boxShadow: `0 0 ${p.size * 2}px ${p.color}0.4)`
              }}
            />
          ))}
        </div>

        <SiteHeader />
        <HeroSection />
        <SystemArchitectureSection />
        <PulseVectorSection />
        <MethodologySection />
        <TechStackSection />

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
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

          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '2rem', fontSize: '0.9rem', color: '#888' }}>
            <a href="/backend" className="hover:text-white transition-colors">Backend Architecture</a>
            <a href="/ml" className="hover:text-white transition-colors">AI & Forecasting</a>
            <a href="/visualization" className="hover:text-white transition-colors">Visualization Logic</a>
            <a href="/frontend" className="hover:text-white transition-colors">Frontend UX</a>
          </div>

          <p style={{ color: '#666', fontSize: '0.8rem', lineHeight: '1.6' }}>
            Engineered for <strong style={{ color: '#fff' }}>UIDAI Hackathon 2026</strong><br />
            Team Antigravity • Project ID: <span className="font-mono text-[#4DB6AC]">UIDAI-HACK-2026-CHRONOS</span>
          </p>
        </footer>
      </main>
    </PageTransition>
  );
}
