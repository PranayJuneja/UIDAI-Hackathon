import { create } from 'zustand';

// Types for the application state
export interface SignalData {
    growth: number;
    flow: number;
    labor: number;
}

export interface StateData {
    state_id: string;
    name: string;
    signals: SignalData;
    hotspot: {
        intensity: number;
        pulse_speed: number;
    };
    districts: number;
    pincodes: number;
}

export interface MapState {
    // Current view
    selectedMonth: string;
    selectedState: string | null;
    hoveredState: string | null;

    // Data
    states: StateData[];
    loading: boolean;
    error: string | null;

    // Actions
    setSelectedMonth: (month: string) => void;
    setSelectedState: (stateId: string | null) => void;
    setHoveredState: (stateId: string | null) => void;
    setStates: (states: StateData[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Computed
    getStateById: (id: string) => StateData | undefined;
}

export const useMapStore = create<MapState>((set, get) => ({
    // Initial state
    selectedMonth: '2025-12',
    selectedState: null,
    hoveredState: null,
    states: [],
    loading: true,
    error: null,

    // Actions
    setSelectedMonth: (month) => set({ selectedMonth: month }),
    setSelectedState: (stateId) => set({ selectedState: stateId }),
    setHoveredState: (stateId) => set({ hoveredState: stateId }),
    setStates: (states) => set({ states, loading: false }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),

    // Computed
    getStateById: (id) => get().states.find(s => s.state_id === id),
}));
