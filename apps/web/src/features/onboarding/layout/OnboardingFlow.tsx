import { Outlet, useLocation } from "react-router-dom";
import { Check, Building2, Search, Eye, Sparkles } from "lucide-react";

export default function OnboardingFlow() {
    const location = useLocation();

    // Determine current step
    let step = 1;
    if (location.pathname.includes("search")) step = 2;
    if (location.pathname.includes("preview")) step = 3;
    if (location.pathname.includes("activate")) step = 4;

    const steps = [
        { num: 1, label: "Organization", icon: Building2 },
        { num: 2, label: "Discovery", icon: Search },
        { num: 3, label: "Preview", icon: Eye },
        { num: 4, label: "Activation", icon: Sparkles },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r h-screen sticky top-0 shadow-sm z-20">
                <div className="p-6 border-b">
                    <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-primary">
                        CoCRM
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Setup your workspace</p>
                </div>
                <nav className="flex-1 p-6 space-y-6">
                    {steps.map((s) => {
                        const isCompleted = step > s.num;
                        const isCurrent = step === s.num;

                        return (
                            <div key={s.num} className={`flex items-start gap-3 relative ${isCurrent ? 'opacity-100' : 'opacity-60'}`}>
                                {/* Connecting Line */}
                                {s.num !== steps.length && (
                                    <div className={`absolute left-4 top-8 bottom-[-24px] w-0.5 ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`} />
                                )}

                                <div className={`
                                    relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                                    ${isCompleted ? 'bg-green-100 border-green-500 text-green-600' :
                                        isCurrent ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-white border-slate-300 text-slate-400'}
                                `}>
                                    {isCompleted ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                                </div>
                                <div className="pt-1">
                                    <p className={`text-sm font-medium ${isCurrent ? 'text-indigo-900' : 'text-slate-600'}`}>{s.label}</p>
                                    {isCurrent && <p className="text-xs text-indigo-500 animate-pulse">In Progress</p>}
                                </div>
                            </div>
                        );
                    })}
                </nav>
                <div className="p-6 border-t bg-slate-50/50">
                    <p className="text-xs text-center text-muted-foreground">© 2024 CoCRM Inc.</p>
                </div>
            </aside>

            {/* Mobile Topbar */}
            <header className="md:hidden bg-white border-b p-4 flex items-center justify-between sticky top-0 z-50">
                <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-primary">CoCRM</span>
                <div className="flex items-center gap-2">
                    <div className="text-xs font-medium text-muted-foreground">Step {step} of 4</div>
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300 ease-out"
                            style={{ width: `${(step / 4) * 100}%` }}
                        />
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 min-h-[calc(100vh-65px)] md:min-h-screen flex flex-col justify-center">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
