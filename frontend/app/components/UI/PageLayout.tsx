"use client";

import { ReactNode } from "react";
import SiteHeader from "../SiteHeader";
import { PageTransition } from "./index";
import ParticleBackground from "./ParticleBackground";

interface PageLayoutProps {
    children: ReactNode;
    /** If true, show the floating particle animation. Defaults to true. */
    showParticles?: boolean;
    /** If true, show the aurora glow background. Defaults to same as showParticles. */
    showAurora?: boolean;
}

/**
 * PageLayout - A consistent layout wrapper for all pages.
 * Includes the aurora background, grid overlay, header, and optional particles.
 */
export default function PageLayout({ children, showParticles = true, showAurora }: PageLayoutProps) {
    // Default showAurora to match showParticles if not explicitly set
    const displayAurora = showAurora ?? showParticles;

    return (
        <PageTransition>
            <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-hidden">
                {/* Interactive Particle Background */}
                {showParticles && <ParticleBackground />}

                {/* Aurora Glow */}
                {displayAurora && <div className="aurora" />}
                <div className="gridOverlay" />

                <SiteHeader />
                {children}

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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', opacity: 0.9 }}>
                        <span style={{
                            fontFamily: "'Fira Code', 'SF Mono', 'Consolas', monospace",
                            fontSize: '1.4rem',
                            letterSpacing: '-0.5px',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <span style={{ color: '#00f0ff', marginRight: '4px', fontWeight: 500 }}>&gt;</span>
                            <span style={{ color: '#FFFFFF', fontWeight: 500 }}>Chronos-X</span>
                            <span style={{
                                color: '#00ff9d',
                                marginLeft: '2px',
                                fontWeight: 500,
                                animation: 'blink 1s step-end infinite'
                            }}>_</span>
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <a href="/backend" className="hover:text-white transition-colors">Backend Architecture</a>
                        <a href="/ml" className="hover:text-white transition-colors">AI &amp; Forecasting</a>
                        <a href="/visualization" className="hover:text-white transition-colors">Visualization Logic</a>
                        <a href="/frontend" className="hover:text-white transition-colors">Frontend UX</a>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.6' }}>
                        Engineered for <strong style={{ color: 'var(--text-primary)' }}>UIDAI Hackathon 2026</strong><br />
                        Team CVPL • TeamID: <span className="font-mono text-[#00f0ff]">UIDAI_7</span>
                    </p>
                </footer>
            </main>
        </PageTransition>
    );
}

