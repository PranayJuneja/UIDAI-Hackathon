"use client";

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

const pageVariants = {
    initial: {
        opacity: 0,
        y: 8,
        scale: 0.99
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1
    },
    exit: {
        opacity: 0,
        y: -8,
        scale: 1.01
    }
};

const pageTransition: any = {
    type: "tween",
    ease: [0.4, 0, 0.2, 1],
    duration: 0.3
};

/**
 * PageTransition - Wrapper component for smooth page transitions
 * Wrap this around page content for enter/exit animations
 */
export default function PageTransition({ children, className = '' }: PageTransitionProps) {
    return (
        <motion.div
            className={className}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
        >
            {children}
        </motion.div>
    );
}
