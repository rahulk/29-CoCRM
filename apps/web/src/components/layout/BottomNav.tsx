import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ListChecks, MessageSquare, Users2, Star } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname.startsWith(path);

    const tabs = [
        {
            label: "Leads",
            path: "/leads",
            icon: Users2,
        },
        {
            label: "Messages",
            path: "/messages",
            icon: MessageSquare,
        },
        {
            label: "Tasks",
            path: "/tasks",
            icon: ListChecks,
        },
        {
            label: "Reputation",
            path: "/reviews",
            icon: Star,
        },
    ];

    return (
        <nav className="fixed bottom-0 z-50 w-full border-t bg-background">
            <div className="container flex h-16 items-center justify-around px-4">
                {tabs.map((tab) => (
                    <Button
                        key={tab.path}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 h-full px-6 hover:bg-transparent",
                            isActive(tab.path)
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => navigate(tab.path)}
                    >
                        <tab.icon className={cn("h-6 w-6", isActive(tab.path) && "fill-current")} />
                        <span className="text-xs font-medium">{tab.label}</span>
                    </Button>
                ))}
            </div>
        </nav>
    );
}
