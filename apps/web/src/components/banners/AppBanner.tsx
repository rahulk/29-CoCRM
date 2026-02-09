import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

interface AppBannerProps {
    variant?: "info" | "success" | "warning" | "destructive";
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    onDismiss?: () => void;
}

export function AppBanner({
    variant = "info",
    title,
    description,
    action,
    // onDismiss,
}: AppBannerProps) {
    const icons = {
        info: Info,
        success: CheckCircle2,
        warning: AlertCircle,
        destructive: XCircle,
    };

    const Icon = icons[variant];

    return (
        <Alert variant={variant === "destructive" ? "destructive" : "default"} className="mb-4">
            <Icon className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            {description && <AlertDescription>{description}</AlertDescription>}
            {action && (
                <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={action.onClick}>
                        {action.label}
                    </Button>
                </div>
            )}
        </Alert>
    );
}
