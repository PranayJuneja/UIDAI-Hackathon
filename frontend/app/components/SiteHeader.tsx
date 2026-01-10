"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Terminal, Code2, Database, BrainCircuit, Box, Activity,
    Server, Workflow, Layers, GitBranch, BarChart3, Map,
    Cpu, TrendingUp, Globe, MapPin, Building2
} from "lucide-react";
import NavDropdown from "./Navigation/NavDropdown";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
    const pathname = usePathname();

    // Navigation structure with sublinks
    const navItems = [
        {
            href: "/",
            label: "Home",
            icon: <Terminal size={14} />,
            sublinks: []
        },
        {
            href: "/backend",
            label: "Backend",
            icon: <Database size={14} />,
            sublinks: [
                { href: "/backend", label: "API Architecture", icon: <Server size={14} /> },
                { href: "/backend#data-pipeline", label: "Data Pipeline", icon: <Workflow size={14} /> },
                { href: "/backend#pulse-vectors", label: "Pulse Vectors", icon: <Layers size={14} /> },
            ]
        },
        {
            href: "/frontend",
            label: "Frontend",
            icon: <Code2 size={14} />,
            sublinks: [
                { href: "/frontend", label: "Component Architecture", icon: <GitBranch size={14} /> },
                { href: "/frontend#state", label: "State Management", icon: <Layers size={14} /> },
                { href: "/frontend#design", label: "Design System", icon: <Box size={14} /> },
            ]
        },
        {
            href: "/visualization",
            label: "Vis",
            icon: <Box size={14} />,
            sublinks: [
                { href: "/visualization", label: "Chart Components", icon: <BarChart3 size={14} /> },
                { href: "/visualization#map", label: "Map Visualization", icon: <Map size={14} /> },
                { href: "/visualization#signals", label: "Signal Rendering", icon: <Activity size={14} /> },
            ]
        },
        {
            href: "/ml",
            label: "ML",
            icon: <BrainCircuit size={14} />,
            sublinks: [
                { href: "/ml", label: "Chronos Model", icon: <Cpu size={14} /> },
                { href: "/ml#forecasting", label: "Forecasting Engine", icon: <TrendingUp size={14} /> },
                { href: "/ml#attestation", label: "LLM Attestation", icon: <BrainCircuit size={14} /> },
            ]
        },
        {
            href: "/dashboard",
            label: "App",
            icon: <Activity size={14} />,
            special: true,
            sublinks: [
                { href: "/dashboard", label: "India Overview", icon: <Globe size={14} /> },
                { href: "/dashboard/state", label: "State View", icon: <MapPin size={14} /> },
                { href: "/dashboard/district", label: "District View", icon: <Building2 size={14} /> },
            ]
        },
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
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== "/" && pathname.startsWith(item.href));

                        // Items with sublinks get dropdown
                        if (item.sublinks && item.sublinks.length > 0) {
                            return (
                                <NavDropdown
                                    key={item.href}
                                    label={item.label}
                                    icon={item.icon}
                                    href={item.href}
                                    sublinks={item.sublinks}
                                    special={item.special}
                                />
                            );
                        }

                        // Simple link for items without sublinks
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navLink} ${isActive ? styles.active : ""} ${item.special ? styles.special : ""}`}
                            >
                                {item.icon}
                                <span className={styles.navLabel}>{item.label}</span>
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
