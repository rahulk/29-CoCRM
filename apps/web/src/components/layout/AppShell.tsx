import { AppBar } from "@/components/layout/AppBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Outlet } from "react-router-dom";

interface AppShellProps {
    children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="flex h-screen w-full flex-col bg-background">
            <AppBar />
            <main className="flex-1 overflow-y-auto px-4 py-4 pb-20 scroll-smooth">
                {children || <Outlet />}
            </main>
            <BottomNav />
        </div>
    );
}
