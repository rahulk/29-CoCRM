import { Outlet, useLocation } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export default function OnboardingFlow() {
    const location = useLocation();

    // Determine step based on path
    let step = 1;
    if (location.pathname.includes("search")) step = 2;
    if (location.pathname.includes("preview")) step = 3;
    if (location.pathname.includes("activate")) step = 4;

    const progress = (step / 4) * 100;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Top Bar with Progress */}
            <div className="w-full bg-white border-b px-4 py-3 sticky top-0 z-50">
                <div className="max-w-md mx-auto space-y-2">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <span>Setup</span>
                        <span>Step {step} of 4</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    );
}
