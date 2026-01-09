import Dashboard from "../dashboard";
import { PageTransition, ErrorBoundary } from "../components/UI";

export default function DashboardPage() {
    return (
        <PageTransition>
            <ErrorBoundary>
                <Dashboard />
            </ErrorBoundary>
        </PageTransition>
    );
}
