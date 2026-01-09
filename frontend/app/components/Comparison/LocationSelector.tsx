"use client";

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../../lib/config';
import styles from './LocationSelector.module.css';

interface LocationResult {
    id: string;
    name: string;
    type: 'state' | 'district' | 'pin';
    parentName?: string;
}

export interface LocationSelectorProps {
    value: LocationResult | null;
    onChange: (location: LocationResult | null) => void;
    placeholder?: string;
    label?: string;
    excludeId?: string;
}

const LocationSelector = memo(function LocationSelector({
    value,
    onChange,
    placeholder = 'Search location...',
    label,
    excludeId,
}: LocationSelectorProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<LocationResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search locations
    const searchLocations = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE}/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`
            );

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();

            // Transform API response to LocationResult format
            const locations: LocationResult[] = data.results.map((result: any) => ({
                id: result.id || result.state_id || result.district_id || result.pincode,
                name: result.name || result.state_name || result.district_name || result.pincode,
                type: result.type || (result.state_id ? 'state' : result.district_id ? 'district' : 'pin'),
                parentName: result.state_name || result.parent_name,
            }));

            // Filter out excluded ID
            const filtered = excludeId
                ? locations.filter(loc => loc.id !== excludeId)
                : locations;

            setResults(filtered);
        } catch (err) {
            setError('Search failed. Please try again.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [excludeId]);

    // Debounced search
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        setIsOpen(true);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            searchLocations(newQuery);
        }, 300);
    }, [searchLocations]);

    // Select location - clears error state
    const handleSelect = useCallback((location: LocationResult) => {
        onChange(location);
        setQuery(location.name);
        setIsOpen(false);
        setResults([]);
        setError(null);
    }, [onChange]);

    // Clear selection
    const handleClear = useCallback(() => {
        onChange(null);
        setQuery('');
        setResults([]);
        inputRef.current?.focus();
    }, [onChange]);

    // Get type badge color
    const getTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'state': return styles.badgeState;
            case 'district': return styles.badgeDistrict;
            case 'pin': return styles.badgePin;
            default: return '';
        }
    };

    return (
        <div className={styles.container} ref={containerRef}>
            {label && <label className={styles.label}>{label}</label>}

            <div className={styles.inputWrapper}>
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                />

                {value && (
                    <button
                        className={styles.clearButton}
                        onClick={handleClear}
                        type="button"
                        aria-label="Clear selection"
                    >
                        ×
                    </button>
                )}

                {loading && <span className={styles.spinner} />}
            </div>

            <AnimatePresence>
                {isOpen && (results.length > 0 || loading || error) && (
                    <motion.div
                        className={styles.dropdown}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                    >
                        {error && (
                            <div className={styles.error}>{error}</div>
                        )}

                        {loading && results.length === 0 && (
                            <div className={styles.loading}>Searching...</div>
                        )}

                        {results.map((result) => (
                            <button
                                key={result.id}
                                className={styles.option}
                                onClick={() => handleSelect(result)}
                                type="button"
                            >
                                <div className={styles.optionContent}>
                                    <span className={styles.optionName}>{result.name}</span>
                                    {result.parentName && (
                                        <span className={styles.optionParent}>
                                            {result.parentName}
                                        </span>
                                    )}
                                </div>
                                <span className={`${styles.typeBadge} ${getTypeBadgeClass(result.type)}`}>
                                    {result.type}
                                </span>
                            </button>
                        ))}

                        {!loading && results.length === 0 && query.length >= 2 && !error && (
                            <div className={styles.noResults}>No locations found</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export default LocationSelector;
export type { LocationResult };
