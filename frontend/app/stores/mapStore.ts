import { create } from 'zustand';

// Types for the application state
export interface SignalData {
    growth: number;
    flow: number;
    labor: number;
}

export interface HotspotData {
    intensity: number;
    pulse_speed: number;
    level?: string;
}

export interface StateData {
    state_id: string;
    name: string;
    signals: SignalData;
    hotspot: HotspotData;
    districts: number;
    pincodes: number;
}

export interface DistrictData {
    district_id: string;
    district_name: string;
    state_name: string;
    signals: SignalData;
    hotspot: HotspotData;
    pin_count: number;
    pincodes: string[];
}

export interface GeoFeature {
    type: string;
    properties: {
        ST_NM?: string;
        NAME_1?: string;
        NAME_2?: string;
        district?: string;
        name?: string;
        [key: string]: any;
    };
    geometry: any;
}

export interface GeoJSON {
    type: string;
    features: GeoFeature[];
}

export type ViewMode = 'india' | 'state';

export interface MapState {
    // Current view
    selectedMonth: string;
    selectedState: string | null;
    hoveredState: string | null;
    hoveredDistrict: string | null;
    viewMode: ViewMode;
    selectedStateForDrilldown: string | null;
    selectedStateName: string | null;

    // Data
    states: StateData[];
    districts: DistrictData[];
    districtGeoData: GeoJSON | null;
    loading: boolean;
    loadingDistricts: boolean;
    error: string | null;

    selectedDistrict: string | null;

    // Timeline State
    isPlaying: boolean;
    playbackSpeed: number;

    // Actions
    setSelectedMonth: (month: string) => void;
    setSelectedState: (stateId: string | null) => void;
    setSelectedDistrict: (districtName: string | null) => void;
    setHoveredState: (stateId: string | null) => void;
    setHoveredDistrict: (districtId: string | null) => void;
    setStates: (states: StateData[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Timeline Actions
    setIsPlaying: (isPlaying: boolean) => void;
    setPlaybackSpeed: (speed: number) => void;
    togglePlayback: () => void;

    // Drill-down actions
    drillIntoState: (stateId: string, stateName: string) => void;
    drillBackToIndia: () => void;
    setDistricts: (districts: DistrictData[]) => void;
    setDistrictGeoData: (geoData: GeoJSON | null) => void;
    setLoadingDistricts: (loading: boolean) => void;

    // Computed
    getStateById: (id: string) => StateData | undefined;
    getDistrictById: (id: string) => DistrictData | undefined;
}

export const useMapStore = create<MapState>((set, get) => ({
    // Initial state
    selectedMonth: '2025-12',
    selectedState: null,
    selectedDistrict: null,
    hoveredState: null,
    hoveredDistrict: null,
    viewMode: 'india',
    selectedStateForDrilldown: null,
    selectedStateName: null,
    states: [],
    districts: [],
    districtGeoData: null,
    loading: true,
    loadingDistricts: false,
    error: null,

    // Timeline State
    isPlaying: false,
    playbackSpeed: 1000, // ms per month

    // Actions
    setSelectedMonth: (month) => set({ selectedMonth: month }),
    setSelectedState: (stateId) => set({ selectedState: stateId }),
    setSelectedDistrict: (districtName) => set({ selectedDistrict: districtName }),
    setHoveredState: (stateId) => set({ hoveredState: stateId }),
    setHoveredDistrict: (districtId) => set({ hoveredDistrict: districtId }),
    setStates: (states) => set({ states, loading: false }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),

    // Timeline Actions
    setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
    setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),
    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

    // Drill-down actions
    drillIntoState: (stateId, stateName) => set({
        viewMode: 'state',
        selectedStateForDrilldown: stateId,
        selectedStateName: stateName,
        loadingDistricts: true,
        districts: [],
        districtGeoData: null,
        selectedDistrict: null,
    }),

    drillBackToIndia: () => set({
        viewMode: 'india',
        selectedStateForDrilldown: null,
        selectedStateName: null,
        districts: [],
        districtGeoData: null,
        hoveredDistrict: null,
        loadingDistricts: false,
        selectedDistrict: null,
    }),

    setDistricts: (districts) => set({ districts, loadingDistricts: false }),
    setDistrictGeoData: (geoData) => set({ districtGeoData: geoData }),
    setLoadingDistricts: (loading) => set({ loadingDistricts: loading }),

    // Computed
    getStateById: (id) => get().states.find(s => s.state_id === id),
    getDistrictById: (id) => get().districts.find(d => d.district_id === id),
}));
