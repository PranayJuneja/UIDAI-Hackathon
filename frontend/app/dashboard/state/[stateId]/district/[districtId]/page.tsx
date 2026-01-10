"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Dashboard from "@/app/dashboard";
import { PageTransition, ErrorBoundary } from "@/app/components/UI";
import { useMapStore, StateData, DistrictData } from "@/app/stores/mapStore";

export default function DistrictPage() {
    const params = useParams();
    const router = useRouter();
    const { states, districts, drillIntoState, setSelectedDistrict, viewMode } = useMapStore();

    const stateId = params.stateId as string;
    const districtId = params.districtId as string;

    useEffect(() => {
        // First, drill into the state
        if (states.length > 0 && stateId) {
            const stateData = states.find((s: StateData) =>
                s.state_id === stateId ||
                s.name.toLowerCase().replace(/\s+/g, '-') === stateId.toLowerCase()
            );

            if (stateData && viewMode === 'india') {
                drillIntoState(stateData.state_id, stateData.name);
            } else if (!stateData) {
                router.push('/dashboard');
            }
        }
    }, [states, stateId, drillIntoState, viewMode, router]);

    useEffect(() => {
        // Once districts are loaded, select the requested district
        if (districts.length > 0 && districtId && viewMode === 'state') {
            const districtData = districts.find((d: DistrictData) =>
                d.district_id === districtId ||
                d.district_name.toLowerCase().replace(/\s+/g, '-') === districtId.toLowerCase()
            );

            if (districtData) {
                setSelectedDistrict(districtData.district_name);
            }
        }
    }, [districts, districtId, setSelectedDistrict, viewMode]);

    return (
        <PageTransition>
            <ErrorBoundary>
                <Dashboard />
            </ErrorBoundary>
        </PageTransition>
    );
}
