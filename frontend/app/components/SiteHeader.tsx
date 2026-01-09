"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Code2, Database, BrainCircuit, Box, Activity } from "lucide-react";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
    const pathname = usePathname();

    const links = [
        { href: "/", label: "Home", icon: <Terminal size={14} /> },
        { href: "/backend", label: "Backend", icon: <Database size={14} /> },
        { href: "/frontend", label: "Frontend", icon: <Code2 size={14} /> },
        { href: "/visualization", label: "Vis", icon: <Box size={14} /> },
        { href: "/ml", label: "ML", icon: <BrainCircuit size={14} /> },
        { href: "/dashboard", label: "App", icon: <Activity size={14} />, special: true },
    ];

    return (
        <motion.header
            className={styles.header}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.brandPrefix}>&gt;</span>
                    <span className={styles.logoText}>Chronos-X</span>
                    <span className={styles.cursor}>_</span>
                </Link>

                <nav className={styles.nav}>
                    {links.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`${styles.navLink} ${isActive ? styles.active : ""} ${link.special ? styles.special : ""
                                    }`}
                            >
                                {link.icon}
                                <span className={styles.navLabel}>{link.label}</span>
                                {isActive && (
                                    <motion.div
                                        className={styles.navIndicator}
                                        layoutId="navIndicator"
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 30,
                                        }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </motion.header>
    );
}
