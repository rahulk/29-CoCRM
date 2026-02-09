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
        <div className="w-full max-w-lg mx-auto space-y-8">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Start Your 7-Day Free Trial</h1>
                <p className="text-slate-500">Get full access to all features. No credit card required.</p>
            </div>

            <Card className="shadow-xl border-primary/20 relative overflow-hidden">
                {/* Badge */}
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                    MOST POPULAR
                </div>

                <CardHeader className="text-center pb-2 pt-8">
                    <CardTitle className="text-4xl font-bold text-slate-900">
                        Free<span className="text-lg font-normal text-slate-500 align-top ml-1">/ 7 days</span>
                    </CardTitle>
                    <CardDescription>Then ₹999/month. Cancel anytime.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4">
                        {[
                            "₹500 Free WhatsApp Credits",
                            "Access to 1,000 Leads/Month",
                            "Unlimited Searches",
                            "AI-Powered Lead Scoring",
                            "Automated Follow-ups"
                        ].map((feature, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="mt-0.5 bg-green-100 text-green-600 rounded-full p-0.5">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-medium text-slate-700">{feature}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>

                <CardFooter className="pb-8 pt-2">
                    <Button onClick={handleActivate} className="w-full py-6 text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Activating...
                            </>
                        ) : (
                            "Start Free Trial Now"
                        )}
                    </Button>
                </CardFooter>
            </Card>

            <p className="text-xs text-center text-slate-400">
                By clicking "Start Free Trial Now", you agree to our Terms of Service and Privacy Policy.
            </p>
        </div>
    );
}
