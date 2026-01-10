"use client";

import Dashboard from "@/app/dashboard";
import { PageTransition, ErrorBoundary } from "@/app/components/UI";

export default function DistrictIndexPage() {
    // This page shows when user clicks "District View" without a specific district
    // Just show the main dashboard - user can select a state then district
    return (
        <PageTransition>
            <ErrorBoundary>
                <Dashboard />
            </ErrorBoundary>
        </PageTransition>
    );
}
