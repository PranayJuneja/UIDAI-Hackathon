"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Dashboard from "@/app/dashboard";
import { PageTransition, ErrorBoundary } from "@/app/components/UI";
import { useMapStore, StateData } from "@/app/stores/mapStore";

export default function StatePage() {
    const params = useParams();
    const router = useRouter();
    const { states, drillIntoState, viewMode } = useMapStore();

    const stateId = params.stateId as string;

    useEffect(() => {
        // Wait for states to load then drill into the requested state
        if (states.length > 0 && stateId) {
            const stateData = states.find((s: StateData) =>
                s.state_id === stateId ||
                s.name.toLowerCase().replace(/\s+/g, '-') === stateId.toLowerCase()
            );

            if (stateData) {
                drillIntoState(stateData.state_id, stateData.name);
            } else {
                // State not found, redirect to main dashboard
                router.push('/dashboard');
            }
        }
    }, [states, stateId, drillIntoState, router]);

    return (
        <PageTransition>
            <ErrorBoundary>
                <Dashboard />
            </ErrorBoundary>
        </PageTransition>
    );
}
