import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { activateTrialFn } from "@/lib/api";

export default function TrialActivationScreen() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleActivate = async () => {
        setIsLoading(true);
        try {
            await activateTrialFn({ lead_count: 5 }); // Optional tracking
            toast.success("Trial Activated! Enjoy your free credits.");
            navigate("/leads");
        } catch (error: any) {
            console.error("Trial activation failed:", error);
            toast.error(error.message || "Could not activate trial. Please contact support.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md border-primary shadow-xl">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold text-primary">Start Your 7-Day Free Trial</CardTitle>
                    <CardDescription>No credit card required.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-sm">₹500 Free Credits</h4>
                                <p className="text-xs text-muted-foreground">Enough to contact ~500 businesses on WhatsApp.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-sm">Access to 1,000 Leads/Month</h4>
                                <p className="text-xs text-muted-foreground">Find more customers in your area instantly.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-sm">Automated WhatsApp Follow-ups</h4>
                                <p className="text-xs text-muted-foreground">Engage leads even when you sleep.</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleActivate} className="w-full py-6 text-lg" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                activating...
                            </>
                        ) : (
                            "Start Free Trial Now"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
