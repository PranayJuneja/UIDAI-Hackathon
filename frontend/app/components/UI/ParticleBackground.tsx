"use client";

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    size: number;
    baseX: number;
    baseY: number;
    vx: number;
    vy: number;
    density: number;
    color: string;
    draw: () => void;
    update: () => void;
}

const ParticleBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const particlesRef = useRef<Particle[]>([]);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Particle class
        class Particle {
            x: number;
            y: number;
            size: number;
            baseX: number;
            baseY: number;
            vx: number;
            vy: number;
            density: number;
            color: string;

            constructor() {
                // We know canvas is not null because of the check at the top of useEffect
                // but TypeScript inside the class needs reassurance or explicit access
                const width = canvas!.width || window.innerWidth;
                const height = canvas!.height || window.innerHeight;

                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 1;
                this.baseX = this.x;
                this.baseY = this.y;
                this.vx = 0;
                this.vy = 0;
                this.density = Math.random() * 30 + 1;

                // Google-inspired color palette
                const colors = [
                    'rgba(66, 133, 244, 0.8)',   // Blue
                    'rgba(52, 168, 83, 0.7)',    // Green
                    'rgba(251, 188, 4, 0.7)',    // Yellow
                    'rgba(168, 85, 247, 0.7)',   // Purple
                    'rgba(234, 67, 53, 0.6)',    // Red
                ];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }

            update() {
                const mouse = mouseRef.current;
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = 150;
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;

                // Calculate force (inverse square law with limit)
                const force = Math.min((maxDistance - distance) / maxDistance, 1);

                if (distance < maxDistance && distance > 0) {
                    // Repel particles from mouse
                    this.vx -= forceDirectionX * force * this.density * 0.02;
                    this.vy -= forceDirectionY * force * this.density * 0.02;
                }

                // Return to original position
                const returnForce = 0.03;
                this.vx += (this.baseX - this.x) * returnForce;
                this.vy += (this.baseY - this.y) * returnForce;

                // Apply friction
                this.vx *= 0.92;
                this.vy *= 0.92;

                // Update position
                this.x += this.vx;
                this.y += this.vy;

                this.draw();
            }
        }

        // Create particles
        const particleCount = Math.min(150, Math.floor((canvas.width * canvas.height) / 8000));
        particlesRef.current = Array.from({ length: particleCount }, () => new Particle());

        // Draw connections between nearby particles
        const drawConnections = () => {
            const particles = particlesRef.current;
            const connectionColor = 'rgba(255, 255, 255, ';

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `${connectionColor}${0.08 * (1 - distance / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        };

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particlesRef.current.forEach(particle => particle.update());
            drawConnections();

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        // Mouse move handler
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        // Touch handler for mobile
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
};

export default ParticleBackground;
