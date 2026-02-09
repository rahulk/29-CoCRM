import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserMenu } from "@/components/layout/UserMenu";

interface AppBarProps {
    title?: string;
    showBack?: boolean;
    actions?: React.ReactNode;
}

export function AppBar({ title, showBack, actions }: AppBarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const getPageTitle = () => {
        if (title) return title;
        const path = location.pathname;
        if (path.startsWith("/leads")) return "Leads";
        if (path.startsWith("/messages")) return "Messages";
        if (path.startsWith("/tasks")) return "Tasks";
        if (path.startsWith("/reviews")) return "Reputation";
        if (path.startsWith("/settings")) return "Settings";
        if (path.startsWith("/profile")) return "Profile";
        if (path.startsWith("/billing")) return "Billing";
        return "CoCRM";
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center px-4">
                {showBack && (
                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => navigate(-1)}>
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 15 15"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                        >
                            <path
                                d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
                                fill="currentColor"
                                fillRule="evenodd"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="sr-only">Back</span>
                    </Button>
                )}
                <div className="flex-1 font-semibold">{getPageTitle()}</div>
                <div className="flex items-center gap-2">
                    {actions}
                    <Button variant="ghost" size="icon" onClick={() => navigate("/notifications")}>
                        <Bell className="h-5 w-5" />
                        <span className="sr-only">Notifications</span>
                    </Button>
                    <UserMenu />
                </div>
            </div>
        </header>
    );
}
