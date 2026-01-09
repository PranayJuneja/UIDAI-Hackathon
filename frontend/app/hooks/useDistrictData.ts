import { useEffect, useCallback, useRef } from 'react';
import { useMapStore, DistrictData, GeoJSON } from '../stores/mapStore';
import { API_BASE, GEOJSON_CDN_BASE, REQUEST_TIMEOUT_MS, CACHE_TTL_MS } from '../lib/config';

// Cache for district GeoJSON data with TTL
interface CacheEntry {
    data: GeoJSON;
    timestamp: number;
}
const geoJsonCache = new Map<string, CacheEntry>();

// Check if cache entry is still valid
function isCacheValid(entry: CacheEntry | undefined): entry is CacheEntry {
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// Map state names to CDN file names
const stateNameToFileName: Record<string, string> = {
    'Andhra Pradesh': 'andhra-pradesh',
    'Arunachal Pradesh': 'arunachal-pradesh',
    'Assam': 'assam',
    'Bihar': 'bihar',
    'Chhattisgarh': 'chhattisgarh',
    'Goa': 'goa',
    'Gujarat': 'gujarat',
    'Haryana': 'haryana',
    'Himachal Pradesh': 'himachal-pradesh',
    'Jammu & Kashmir': 'jammu-and-kashmir',
    'Jammu and Kashmir': 'jammu-and-kashmir',
    'Jharkhand': 'jharkhand',
    'Karnataka': 'karnataka',
    'Kerala': 'kerala',
    'Madhya Pradesh': 'madhya-pradesh',
    'Maharashtra': 'maharashtra',
    'Manipur': 'manipur',
    'Meghalaya': 'meghalaya',
    'Mizoram': 'mizoram',
    'Nagaland': 'nagaland',
    'Odisha': 'odisha',
    'Punjab': 'punjab',
    'Rajasthan': 'rajasthan',
    'Sikkim': 'sikkim',
    'Tamil Nadu': 'tamil-nadu',
    'Telangana': 'telangana',
    'Tripura': 'tripura',
    'Uttar Pradesh': 'uttar-pradesh',
    'Uttarakhand': 'uttarakhand',
    'West Bengal': 'west-bengal',
    'Delhi': 'delhi',
    'Ladakh': 'ladakh',
    'Puducherry': 'puducherry',
    'Chandigarh': 'chandigarh',
    'Andaman & Nicobar': 'andaman-and-nicobar',
    'Dadra & Nagar Haveli': 'dadra-and-nagar-haveli',
    'Daman & Diu': 'daman-and-diu',
    'Lakshadweep': 'lakshadweep',
};

export function getGeoJSONFileName(stateName: string): string {
    return stateNameToFileName[stateName] || stateName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
}

export function useDistrictData() {
    const {
        viewMode,
        selectedStateForDrilldown,
        selectedStateName,
        selectedMonth,
        setDistricts,
        setDistrictGeoData,
        setLoadingDistricts,
        setError,
        districts,
        districtGeoData,
        loadingDistricts,
    } = useMapStore();

    const abortControllerRef = useRef<AbortController | null>(null);

    // Fetch district data and GeoJSON when drilling into a state
    useEffect(() => {
        if (viewMode !== 'state' || !selectedStateForDrilldown || !selectedStateName) {
            return;
        }

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

        async function fetchDistrictData() {
            setLoadingDistricts(true);

            try {
                const apiPromise = fetch(
                    `${API_BASE}/api/states/${selectedStateForDrilldown}?month=${selectedMonth}`,
                    { signal: controller.signal }
                ).then(res => {
                    if (!res.ok) throw new Error(`API error: ${res.status}`);
                    return res.json();
                });

                // Check cache for GeoJSON (with TTL), or fetch from CDN
                const fileName = getGeoJSONFileName(selectedStateName!);
                let geoJsonPromise: Promise<GeoJSON>;

                const cachedEntry = geoJsonCache.get(fileName);
                if (isCacheValid(cachedEntry)) {
                    geoJsonPromise = Promise.resolve(cachedEntry.data);
                } else {
                    geoJsonPromise = fetch(`${GEOJSON_CDN_BASE}/${fileName}.geojson`)
                        .then(res => {
                            if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
                            return res.json();
                        })
                        .then((data: GeoJSON) => {
                            geoJsonCache.set(fileName, { data, timestamp: Date.now() });
                            return data;
                        });
                }

                // Execute both requests in parallel
                const [apiData, geoData] = await Promise.all([apiPromise, geoJsonPromise]);

                // Transform API response to DistrictData format
                const districtData: DistrictData[] = (apiData.districts || []).map((d: any) => ({
                    district_id: d.district_id,
                    district_name: d.district_name,
                    state_name: d.state_name,
                    signals: {
                        growth: d.signals?.growth || 0,
                        flow: d.signals?.flow || 0,
                        labor: d.signals?.labor || 0,
                    },
                    hotspot: {
                        intensity: d.hotspot?.intensity || 0,
                        pulse_speed: d.hotspot?.pulse_speed || 1,
                        level: d.hotspot?.level || 'low',
                    },
                    pin_count: d.pin_count || 0,
                    pincodes: d.pincodes || [],
                }));

                setDistricts(districtData);
                setDistrictGeoData(geoData);

            } catch (err) {
                if (controller.signal.aborted) {
                    return; // Ignore aborted requests
                }
                console.error('Failed to fetch district data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load district data');
                setLoadingDistricts(false);
            } finally {
                clearTimeout(timeoutId);
            }
        }

        fetchDistrictData();

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [viewMode, selectedStateForDrilldown, selectedStateName, selectedMonth, setDistricts, setDistrictGeoData, setLoadingDistricts, setError]);

    // Get district name from GeoJSON feature
    const getDistrictName = useCallback((feature: any): string => {
        return feature.properties?.NAME_2 ||
            feature.properties?.district ||
            feature.properties?.name ||
            feature.properties?.DISTRICT ||
            '';
    }, []);

    // Match district data to GeoJSON feature by name
    const getDistrictData = useCallback((districtName: string): DistrictData | undefined => {
        const normalizedName = districtName.toLowerCase().trim();
        return districts.find(d =>
            d.district_name.toLowerCase().trim() === normalizedName ||
            d.district_name.toLowerCase().includes(normalizedName) ||
            normalizedName.includes(d.district_name.toLowerCase())
        );
    }, [districts]);

    return {
        districts,
        districtGeoData,
        loadingDistricts,
        getDistrictName,
        getDistrictData,
    };
}

// Clear the GeoJSON cache (useful for testing)
export function clearDistrictGeoCache() {
    geoJsonCache.clear();
}
