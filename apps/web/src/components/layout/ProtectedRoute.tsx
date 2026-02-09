import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { LoadingScreen } from "./LoadingScreen";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // TODO: Add tenant and subscription checks here in Phase 1

    return <>{children}</>;
};
