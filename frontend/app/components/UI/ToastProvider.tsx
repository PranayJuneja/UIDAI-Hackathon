"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast, { ToastData, ToastType } from './Toast';
import styles from './Toast.module.css';

interface ToastContextValue {
    showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    success: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

/**
 * ToastProvider - Provides toast functionality to the entire app
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((
        type: ToastType,
        title: string,
        message?: string,
        duration: number = 4000
    ) => {
        const id = `toast-${++toastIdCounter}`;
        const newToast: ToastData = { id, type, title, message, duration };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss
        setTimeout(() => removeToast(id), duration);
    }, [removeToast]);

    const contextValue: ToastContextValue = {
        showToast,
        success: (title, message) => showToast('success', title, message),
        info: (title, message) => showToast('info', title, message),
        warning: (title, message) => showToast('warning', title, message),
        error: (title, message) => showToast('error', title, message)
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}

            {/* Toast Container - Portal */}
            <div className={styles.toastContainer}>
                <AnimatePresence mode="popLayout">
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            {...toast}
                            onClose={removeToast}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

/**
 * useToast - Hook to access toast functions from any component
 */
export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }

    return context;
}
