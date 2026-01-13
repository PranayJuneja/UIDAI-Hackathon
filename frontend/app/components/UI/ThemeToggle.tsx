"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './ThemeToggle.module.css';

const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Check for saved theme preference or default to dark
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme === 'light') {
            setIsDark(false);
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            // Default to dark mode
            setIsDark(true);
            document.documentElement.removeAttribute('data-theme');
        }
    }, []);

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);

        if (newIsDark) {
            // Dark mode = remove attribute (use :root defaults)
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            // Light mode = set attribute
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <motion.button
            className={styles.themeToggle}
            onClick={toggleTheme}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <div className={styles.toggleTrack}>
                <motion.div
                    className={styles.toggleThumb}
                    animate={{
                        x: isDark ? 24 : 0,
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                    }}
                >
                    {/* Sun Icon */}
                    <motion.svg
                        className={styles.toggleIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        animate={{
                            scale: isDark ? 0 : 1,
                            rotate: isDark ? -90 : 0,
                            opacity: isDark ? 0 : 1,
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </motion.svg>

                    {/* Moon Icon */}
                    <motion.svg
                        className={styles.toggleIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        animate={{
                            scale: isDark ? 1 : 0,
                            rotate: isDark ? 0 : 90,
                            opacity: isDark ? 1 : 0,
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </motion.svg>
                </motion.div>

                {/* Background Icons */}
                <div className={styles.trackIcons}>
                    <svg className={styles.trackSun} viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="5" />
                    </svg>
                    <svg className={styles.trackMoon} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                </div>
            </div>
        </motion.button>
    );
};

export default ThemeToggle;
