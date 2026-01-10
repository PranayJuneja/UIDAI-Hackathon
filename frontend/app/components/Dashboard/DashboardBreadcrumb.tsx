"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight, Globe, MapPin, Building2 } from "lucide-react";
import { useMapStore } from "../../stores/mapStore";
import styles from "./DashboardBreadcrumb.module.css";

export default function DashboardBreadcrumb() {
    const router = useRouter();
    const {
        viewMode,
        selectedStateName,
        selectedDistrict,
        drillBackToIndia,
        setSelectedDistrict
    } = useMapStore();

    const handleIndiaClick = () => {
        drillBackToIndia();
        router.push('/dashboard');
    };

    const handleStateClick = () => {
        setSelectedDistrict(null);
    };

    // Only show breadcrumb when in state or district view
    if (viewMode === 'india' && !selectedDistrict) {
        return null;
    }

    return (
        <motion.nav
            className={styles.breadcrumb}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            {/* India */}
            <button
                onClick={handleIndiaClick}
                className={`${styles.breadcrumbItem} ${viewMode === 'india' && !selectedDistrict ? styles.active : ''}`}
            >
                <span className={styles.icon}><Globe size={14} /></span>
                <span>India</span>
            </button>

            {/* State */}
            {selectedStateName && (
                <>
                    <ChevronRight size={12} className={styles.separator} />
                    <button
                        onClick={handleStateClick}
                        className={`${styles.breadcrumbItem} ${viewMode === 'state' && !selectedDistrict ? styles.active : ''}`}
                    >
                        <span className={styles.icon}><MapPin size={14} /></span>
                        <span>{selectedStateName}</span>
                    </button>
                </>
            )}

            {/* District */}
            {selectedDistrict && (
                <>
                    <ChevronRight size={12} className={styles.separator} />
                    <span className={`${styles.breadcrumbItem} ${styles.active}`}>
                        <span className={styles.icon}><Building2 size={14} /></span>
                        <span>{selectedDistrict}</span>
                    </span>
                </>
            )}
        </motion.nav>
    );
}
