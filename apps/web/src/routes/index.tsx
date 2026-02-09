import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PublicLayout } from "@/components/layout/PublicLayout";
import LeadListScreen from "@/features/leads/pages/LeadListScreen";
import InboxScreen from "@/features/communication/pages/InboxScreen";
import TaskListScreen from "@/features/tasks/pages/TaskListScreen";
import LoginScreen from "@/features/auth/pages/LoginScreen";
import ProfileScreen from "@/features/auth/pages/ProfileScreen";
import LandingPage from "@/pages/LandingPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/TermsOfServicePage";

// Lazy placeholders for auth routes
const CompanySetupScreen = () => <div className="p-4">Onboarding Step 1</div>;

const router = createBrowserRouter([
    {
        element: <PublicLayout />,
        children: [
            {
                path: "/",
                element: <LandingPage />,
            },
            {
                path: "privacy",
                element: <PrivacyPolicyPage />,
            },
            {
                path: "terms",
                element: <TermsOfServicePage />,
            },
        ],
    },
    {
        path: "/login",
        element: <LoginScreen />,
    },
    {
        path: "/onboarding/company",
        element: <CompanySetupScreen />,
    },
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <AppShell />
            </ProtectedRoute>
        ),
        children: [
            {
                path: "leads",
                element: <LeadListScreen />,
            },
            {
                path: "messages",
                element: <InboxScreen />,
            },
            {
                path: "tasks",
                element: <TaskListScreen />,
            },
            {
                path: "profile",
                element: <ProfileScreen />,
            },
        ],
    },
    {
        path: "*",
        element: <Navigate to="/" replace />,
    },
]);

export function AppRoutes() {
    return <RouterProvider router={router} />;
}
