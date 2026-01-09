import { useEffect, useState, useRef } from 'react';
import { useMapStore, StateData } from '../stores/mapStore';
import { API_BASE, REQUEST_TIMEOUT_MS } from '../lib/config';

export function useMapData() {
    const {
        selectedMonth,
        setStates,
        setLoading,
        setError,
        states
    } = useMapStore();

    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        // Cancel previous request if still pending
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Set timeout for the request
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, REQUEST_TIMEOUT_MS);

        async function fetchData() {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE}/api/states?month=${selectedMonth}`, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Failed to fetch states: ${response.status}`);
                }

                const data = await response.json();

                // API returns array of StateAggregation directly
                // Transform API response to our format
                const stateData: StateData[] = data.map((s: any) => ({
                    state_id: s.state_id,
                    name: s.state_name,
                    signals: {
                        growth: s.signals?.growth || 0,
                        flow: s.signals?.flow || 0,
                        labor: s.signals?.labor || 0,
                    },
                    hotspot: {
                        intensity: s.hotspot?.intensity || 0,
                        pulse_speed: s.hotspot?.pulse_speed || 1,
                    },
                    districts: s.top_districts?.length || 0,
                    pincodes: s.pin_count || 0,
                }));

                setStates(stateData);
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    // Request was cancelled - no action needed
                    return;
                }
                console.error('Failed to fetch states:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                clearTimeout(timeoutId);
            }
        }

        fetchData();

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [selectedMonth, setStates, setLoading, setError]);

    return { states, loading: useMapStore.getState().loading };
}

// Mapping from our state IDs to GeoJSON state names
// Updated for the new GeoJSON which uses ST_NM property
// State IDs now match api_server.py STATE_ID_MAP
export const STATE_ID_TO_GEOJSON: Record<string, string[]> = {
    'AP': ['Andhra Pradesh'],
    'AR': ['Arunachal Pradesh'],
    'AS': ['Assam'],
    'BR': ['Bihar'],
    'CT': ['Chhattisgarh'],  // Changed from CG to CT to match API
    'GA': ['Goa'],
    'GJ': ['Gujarat'],
    'HR': ['Haryana'],
    'HP': ['Himachal Pradesh'],
    'JK': ['Jammu & Kashmir', 'Jammu and Kashmir'],
    'JH': ['Jharkhand'],
    'KA': ['Karnataka'],
    'KL': ['Kerala'],
    'MP': ['Madhya Pradesh'],
    'MH': ['Maharashtra'],
    'MN': ['Manipur'],
    'ML': ['Meghalaya'],
    'MZ': ['Mizoram'],
    'NL': ['Nagaland'],
    'OR': ['Odisha', 'Orissa'],
    'PB': ['Punjab'],
    'RJ': ['Rajasthan'],
    'SK': ['Sikkim'],
    'TN': ['Tamil Nadu'],
    'TG': ['Telangana'],  // Changed from TS to TG to match API
    'TR': ['Tripura'],
    'UP': ['Uttar Pradesh'],
    'UT': ['Uttarakhand', 'Uttaranchal'],  // Changed from UK to UT to match API
    'WB': ['West Bengal'],
    'DL': ['Delhi', 'NCT of Delhi'],
    'AN': ['Andaman & Nicobar', 'Andaman and Nicobar', 'Andaman & Nicobar Islands'],
    'CH': ['Chandigarh'],
    'DN': ['Dadra and Nagar Haveli', 'Dadra & Nagar Haveli and Daman & Diu', 'Dadra and Nagar Haveli and Daman and Diu'],
    'DD': ['Daman and Diu', 'Daman & Diu'],
    'LD': ['Lakshadweep'],
    'PY': ['Puducherry', 'Pondicherry'],
    'LA': ['Ladakh'],
};

export function getGeoJSONStateName(stateId: string): string {
    const names = STATE_ID_TO_GEOJSON[stateId];
    return names ? names[0] : stateId;
}

export function getStateIdFromGeoJSON(name: string): string | undefined {
    const normalizedName = name.toLowerCase().trim();

    for (const [stateId, names] of Object.entries(STATE_ID_TO_GEOJSON)) {
        if (names.some(n => n.toLowerCase() === normalizedName)) {
            return stateId;
        }
    }

    // Fuzzy match for partial matches
    for (const [stateId, names] of Object.entries(STATE_ID_TO_GEOJSON)) {
        if (names.some(n => n.toLowerCase().includes(normalizedName) || normalizedName.includes(n.toLowerCase()))) {
            return stateId;
        }
    }

    return undefined;
}
