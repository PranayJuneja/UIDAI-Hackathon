"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import styles from "./NavDropdown.module.css";

export interface NavSublink {
    href: string;
    label: string;
    icon?: ReactNode;
    description?: string;
}

export interface NavDropdownProps {
    label: string;
    icon?: ReactNode;
    href?: string;
    sublinks: NavSublink[];
    special?: boolean;
}

export default function NavDropdown({
    label,
    icon,
    href,
    sublinks,
    special = false
}: NavDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Check if any sublink is active
    const isActive = href
        ? pathname === href || pathname.startsWith(href + "/")
        : sublinks.some(link => pathname === link.href || pathname.startsWith(link.href + "/"));

    // Handle hover with delay for better UX
    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 150);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            className={`${styles.dropdownContainer} ${special ? styles.special : ""}`}
            ref={containerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {href ? (
                <Link
                    href={href}
                    className={`${styles.dropdownTrigger} ${isActive ? styles.active : ""}`}
                >
                    {icon}
                    <span>{label}</span>
                    <ChevronDown
                        size={12}
                        className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                    />
                </Link>
            ) : (
                <button
                    className={`${styles.dropdownTrigger} ${isActive ? styles.active : ""}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {icon}
                    <span>{label}</span>
                    <ChevronDown
                        size={12}
                        className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                    />
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.dropdownMenu}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                        {sublinks.map((sublink, index) => (
                            <Link
                                key={sublink.href}
                                href={sublink.href}
                                className={`${styles.dropdownItem} ${pathname === sublink.href ? styles.activeItem : ""
                                    }`}
                                onClick={() => setIsOpen(false)}
                            >
                                {sublink.icon && (
                                    <span className={styles.dropdownItemIcon}>
                                        {sublink.icon}
                                    </span>
                                )}
                                <span>{sublink.label}</span>
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
