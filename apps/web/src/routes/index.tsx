import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PublicLayout } from "@/components/layout/PublicLayout";
import LeadListScreen from "@/features/leads/pages/LeadListScreen";
import NewSearchScreen from "@/features/leads/pages/NewSearchScreen";
import ManualAddLeadScreen from "@/features/leads/pages/ManualAddLeadScreen";
import LeadDetailScreen from "@/features/leads/pages/LeadDetailScreen";
import InboxScreen from "@/features/communication/pages/InboxScreen";
import TaskListScreen from "@/features/tasks/pages/TaskListScreen";
import LoginScreen from "@/features/auth/pages/LoginScreen";
import SignUpScreen from "@/features/auth/pages/SignUpScreen";
import LandingPage from "@/pages/LandingPage";
import ProfileScreen from "@/features/settings/pages/ProfileScreen";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/TermsOfServicePage";
import SettingsScreen from "@/features/settings/pages/SettingsScreen";
import OnboardingFlow from "@/features/onboarding/layout/OnboardingFlow";
import CompanySetupScreen from "@/features/onboarding/pages/CompanySetupScreen";
import FirstSearchScreen from "@/features/onboarding/pages/FirstSearchScreen";
import LeadPreviewScreen from "@/features/onboarding/pages/LeadPreviewScreen";
import TrialActivationScreen from "@/features/onboarding/pages/TrialActivationScreen";
import IntegrationsScreen from "@/features/settings/pages/IntegrationsScreen";
import IntegrationsCallback from "@/features/settings/pages/IntegrationsCallback";
import ReviewsScreen from "@/features/reputation/pages/ReviewsScreen";

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
        path: "/signup",
        element: <SignUpScreen />,
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
                path: "leads/search",
                element: <NewSearchScreen />,
            },
            {
                path: "leads/add",
                element: <ManualAddLeadScreen />,
            },
            {
                path: "leads/:id",
                element: <LeadDetailScreen />,
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
                path: "reviews",
                element: <ReviewsScreen />,
            },
            {
                path: "profile",
                element: <ProfileScreen />,
            },
            {
                path: "settings",
                element: <SettingsScreen />,
            },
            {
                path: "settings/integrations",
                element: <IntegrationsScreen />,
            },
            {
                path: "settings/integrations/callback",
                element: <IntegrationsCallback />,
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
