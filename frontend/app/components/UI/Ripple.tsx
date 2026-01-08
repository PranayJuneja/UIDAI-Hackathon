"use client";

import React, { useState, useCallback, useRef, MouseEvent as ReactMouseEvent } from 'react';
import styles from './Ripple.module.css';

interface RippleInstance {
    id: number;
    x: number;
    y: number;
    size: number;
}

interface RippleProps extends React.HTMLAttributes<HTMLDivElement> {
    color?: 'primary' | 'secondary' | 'light' | 'subtle';
    duration?: number;
    disabled?: boolean;
    children: React.ReactNode;
}

/**
 * Ripple - A wrapper component that adds Material-style ripple effects on click
 */
export default function Ripple({
    color = 'primary',
    duration = 600,
    disabled = false,
    children,
    className = '',
    onClick,
    ...props
}: RippleProps) {
    const [ripples, setRipples] = useState<RippleInstance[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const rippleIdRef = useRef(0);

    const handleClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
        if (disabled) {
            onClick?.(e);
            return;
        }

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate ripple size to cover the entire element
        const size = Math.max(rect.width, rect.height) * 2;

        const newRipple: RippleInstance = {
            id: rippleIdRef.current++,
            x: x - size / 2,
            y: y - size / 2,
            size
        };

        setRipples(prev => [...prev, newRipple]);

        // Remove ripple after animation
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== newRipple.id));
        }, duration);

        onClick?.(e);
    }, [disabled, duration, onClick]);

    return (
        <div
            ref={containerRef}
            className={`${styles.rippleContainer} ${className}`}
            onClick={handleClick}
            {...props}
        >
            {children}
            {ripples.map(ripple => (
                <span
                    key={ripple.id}
                    className={`${styles.ripple} ${styles[color]}`}
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: ripple.size,
                        height: ripple.size,
                        animationDuration: `${duration}ms`
                    }}
                />
            ))}
        </div>
    );
}

/**
 * useRipple - Hook for imperative ripple creation (e.g., on SVG elements)
 * Returns a function to create ripple at specified coordinates
 */
export function useRipple(containerRef: React.RefObject<HTMLElement | null>) {
    const [ripples, setRipples] = useState<RippleInstance[]>([]);
    const rippleIdRef = useRef(0);

    const createRipple = useCallback((clientX: number, clientY: number, size?: number) => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const rippleSize = size || Math.max(rect.width, rect.height) * 0.5;

        const newRipple: RippleInstance = {
            id: rippleIdRef.current++,
            x,
            y,
            size: rippleSize
        };

        setRipples(prev => [...prev, newRipple]);

        // Remove after animation
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== newRipple.id));
        }, 800);
    }, [containerRef]);

    const RippleElements = () => (
        <>
            {ripples.map(ripple => (
                <div
                    key={ripple.id}
                    className={styles.mapRipple}
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: ripple.size,
                        height: ripple.size
                    }}
                />
            ))}
        </>
    );

    return { createRipple, RippleElements };
}
