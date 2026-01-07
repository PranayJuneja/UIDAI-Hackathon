import React, { memo } from 'react';
import { motion } from 'framer-motion';
import styles from '../../dashboard.module.css';

interface DashboardHotspotsProps {
    title: string;
    loading: boolean;
    items: any[];
}

const DashboardHotspots = memo(function DashboardHotspots({
    title,
    loading,
    items,
    onItemClick
}: DashboardHotspotsProps & { onItemClick?: (item: any) => void }) {
    return (
        <motion.div
            className={styles.hotspotsCard}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
        >
            <h3 className={styles.cardTitle}>{title}</h3>

            {loading ? (
                <div className={styles.loadingState}>Loading rankings...</div>
            ) : (
                <div className={styles.hotspotsList}>
                    {items.map((item: any, i) => (
                        <motion.div
                            key={item.state_id || item.district_id}
                            className={styles.hotspotItem}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                            onClick={() => onItemClick?.(item)}
                            style={{ cursor: onItemClick ? 'pointer' : 'default' }}
                        >
                            <span className={styles.hotspotRank}>{i + 1}</span>
                            <span className={styles.hotspotName}>
                                {item.name || item.district_name}
                            </span>
                            <span
                                className={styles.hotspotIntensity}
                                style={{
                                    color: (item.hotspot?.intensity || 0) > 0.66 ? 'var(--hotspot-high)' :
                                        (item.hotspot?.intensity || 0) > 0.33 ? 'var(--hotspot-medium)' :
                                            'var(--hotspot-low)'
                                }}
                            >
                                {Math.round((item.hotspot?.intensity || 0) * 100)}%
                            </span>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
});

export default DashboardHotspots;
