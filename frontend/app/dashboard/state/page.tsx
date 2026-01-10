"use client";

import Dashboard from "@/app/dashboard";
import { PageTransition, ErrorBoundary } from "@/app/components/UI";

export default function StateIndexPage() {
    // This page shows when user clicks "State View" without a specific state
    // Just show the main dashboard - user can select a state from the map
    return (
        <PageTransition>
            <ErrorBoundary>
                <Dashboard />
            </ErrorBoundary>
        </PageTransition>
    );
}
