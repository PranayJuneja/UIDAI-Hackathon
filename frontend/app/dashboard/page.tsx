import Dashboard from "../dashboard";
import { PageTransition } from "../components/UI";

export default function DashboardPage() {
    return (
        <PageTransition>
            <Dashboard />
        </PageTransition>
    );
}
