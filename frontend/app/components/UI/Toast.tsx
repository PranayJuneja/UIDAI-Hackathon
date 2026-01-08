"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastData {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastProps extends ToastData {
    onClose: (id: string) => void;
}

const icons = {
    success: CheckCircle,
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle
};

/**
 * Toast - Individual toast notification component
 */
export default function Toast({
    id,
    type,
    title,
    message,
    duration = 4000,
    onClose
}: ToastProps) {
    const Icon = icons[type];

    return (
        <motion.div
            className={`${styles.toast} ${styles[type]}`}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => onClose(id)}
            layout
        >
            <div className={`${styles.toastIcon} ${styles[type]}`}>
                <Icon size={18} />
            </div>

            <div className={styles.toastContent}>
                <div className={styles.toastTitle}>{title}</div>
                {message && <div className={styles.toastMessage}>{message}</div>}
            </div>

            <button
                className={styles.toastClose}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(id);
                }}
            >
                <X size={14} />
            </button>

            {/* Progress bar for auto-dismiss */}
            <div
                className={`${styles.toastProgress} ${styles[type]}`}
                style={{ animationDuration: `${duration}ms` }}
            />
        </motion.div>
    );
}
