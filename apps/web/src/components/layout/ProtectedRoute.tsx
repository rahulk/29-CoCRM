import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { useCurrentTenant } from "@/features/auth/hooks/useCurrentTenant";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { user, claims, loading: authLoading } = useAuth();
    const location = useLocation();

    // Only invoke tenant hook if we have a tenant_id claim
    const hasTenantClaim = !!claims?.tenant_id;
    const { data: tenant, isLoading: tenantLoading } = useCurrentTenant();

    if (authLoading || (hasTenantClaim && tenantLoading)) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const path = location.pathname;

    // 1. NO TENANT -> Must be on Step 1 (Company Setup)
    if (!hasTenantClaim) {
        if (path !== "/onboarding/company") {
            return <Navigate to="/onboarding/company" replace />;
        }
        return <>{children}</>;
    }

    // 2. HAS TENANT but PENDING (Status Check)
    // If status is "pending", enforce onboarding steps 2, 3, 4.
    // If they try to access main app (/leads, etc.), redirect back to onboarding.
    if (tenant?.subscription_status === 'pending') {
        const allowedPaths = [
            "/onboarding/search",
            "/onboarding/preview",
            "/onboarding/activate"
        ];

        // If trying to access Step 1 (Company) -> Fwd to Search
        if (path === "/onboarding/company") {
            return <Navigate to="/onboarding/search" replace />;
        }

        // If trying to access any non-allowed path (e.g., /leads), redirect to current onboarding step
        // We can be smarter here based on `tenant.onboarding_step`?
        // Let's at least ensure they stay in /onboarding/ section.
        const isAllowed = allowedPaths.some(p => path.startsWith(p));

        if (!isAllowed) {
            // Default them to Step 2 (Search) for now, or check detailed state if you want
            return <Navigate to="/onboarding/search" replace />;
        }
    }

    // 3. HAS TENANT and ACTIVE/TRIAL -> Block Onboarding Routes
    if (tenant?.subscription_status === 'active' || tenant?.subscription_status === 'trial') {
        if (path.startsWith("/onboarding")) {
            return <Navigate to="/leads" replace />;
        }
    }

    return <>{children}</>;
};
