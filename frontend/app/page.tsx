"use client";

import { useEffect, useState } from "react";
import HeroSection from "./components/Home/HeroSection";
import SiteHeader from "./components/SiteHeader";
import PulseVectorSection from "./components/Home/PulseVectorSection";
import MethodologySection from "./components/Home/MethodologySection";
import TechStackSection from "./components/Home/TechStackSection";
import { Activity } from "lucide-react";
import "./globals.css";

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

  useEffect(() => {
    // Client-side only to prevent hydration mismatch
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
            }}
          />
        ))}
      </div>

      <SiteHeader />
      <HeroSection />
      <PulseVectorSection />
      <MethodologySection />
      <TechStackSection />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1rem', opacity: 0.8 }}>
          <Activity size={20} />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Chronos-X</span>
        </div>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Engineered for <strong style={{ color: '#fff' }}>UIDAI Hackathon 2026</strong>
          <br />
          Project ID: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>UIDAI-HACK-2026-CHRONOS</span>
        </p>
      </footer>
    </main>
  );
}
