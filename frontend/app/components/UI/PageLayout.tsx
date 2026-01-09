"use client";

import { ReactNode, useEffect, useState } from "react";
import SiteHeader from "../SiteHeader";
import { PageTransition } from "./index";

interface Particle {
    id: number;
    left: string;
    top: string;
    size: number;
    duration: number;
    delay: number;
    color: string;
}

interface PageLayoutProps {
    children: ReactNode;
    /** If true, show the floating particle animation. Defaults to true. */
    showParticles?: boolean;
}

/**
 * PageLayout - A consistent layout wrapper for all pages.
 * Includes the aurora background, grid overlay, header, and optional particles.
 */
export default function PageLayout({ children, showParticles = true }: PageLayoutProps) {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        if (!showParticles) return;
        // Client-side only to prevent hydration mismatch
        const newParticles = Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 20 + 20,
            delay: Math.random() * 10,
            color: Math.random() > 0.5 ? 'rgba(77, 182, 172, ' : 'rgba(167, 139, 250, '
        }));
        setParticles(newParticles);
    }, [showParticles]);

    return (
        <PageTransition>
            <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-hidden">
                {/* Ambient Background Elements */}
                <div className="aurora" />
                <div className="gridOverlay" />

                {/* Floating Particles */}
                {showParticles && (
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
                                    background: `${p.color}0.5)`,
                                    boxShadow: `0 0 ${p.size * 2}px ${p.color}0.4)`
                                }}
                            />
                        ))}
                    </div>
                )}

                <SiteHeader />
                {children}
            </main>
        </PageTransition>
    );
}
