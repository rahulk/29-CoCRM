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

// Onboarding Screens
import OnboardingFlow from "@/features/onboarding/layout/OnboardingFlow";
import CompanySetupScreen from "@/features/onboarding/pages/CompanySetupScreen";
import FirstSearchScreen from "@/features/onboarding/pages/FirstSearchScreen";
import LeadPreviewScreen from "@/features/onboarding/pages/LeadPreviewScreen";
import TrialActivationScreen from "@/features/onboarding/pages/TrialActivationScreen";

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
        path: "/onboarding",
        element: (
            <ProtectedRoute>
                <OnboardingFlow />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="company" replace />, // Default, but ProtectedRoute may override
            },
            {
                path: "company",
                element: <CompanySetupScreen />,
            },
            {
                path: "search",
                element: <FirstSearchScreen />,
            },
            {
                path: "preview",
                element: <LeadPreviewScreen />,
            },
            {
                path: "activate",
                element: <TrialActivationScreen />,
            },
        ],
    },
    {
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
