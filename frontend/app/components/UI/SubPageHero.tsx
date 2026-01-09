"use client";

import { motion } from "framer-motion";
import styles from "../Home/Home.module.css";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface SubPageHeroProps {
    title: string;
    subtitle: ReactNode;
    badge: string;
    icon: LucideIcon;
}

export default function SubPageHero({ title, subtitle, badge, icon: Icon }: SubPageHeroProps) {
    return (
        <section className={styles.heroSection} style={{ minHeight: '45vh', paddingBottom: '2rem' }}>
            <motion.div
                className={styles.heroContent}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <div className={styles.heroBadge}>
                    <Icon size={14} className="text-[#A78BFA]" />
                    <span className="tracking-widest">{badge}</span>
                </div>
                <h1 className={styles.heroTitle} style={{ fontSize: '3.5rem' }}>{title}</h1>
                <div className={styles.heroSubtitle} style={{ fontSize: '1.2rem', maxWidth: '700px' }}>
                    {subtitle}
                </div>
            </motion.div>
        </section>
    );
}
