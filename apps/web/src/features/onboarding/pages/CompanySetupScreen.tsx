import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { createTenantFn } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function CompanySetupScreen() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [companyName, setCompanyName] = useState("");
    const [city, setCity] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);
        try {
            // 1. Create Tenant via Cloud Function
            await createTenantFn({
                company_name: companyName,
                city: city,
                admin_name: user.displayName || "Admin",
            });

            // 2. Refresh Token to get new Custom Claims (tenant_id)
            await auth.currentUser?.getIdToken(true);

            toast.success("Organization created successfully!");
            navigate("/onboarding/search");

        } catch (error: any) {
            console.error("Error creating tenant:", error);
            toast.error(error.message || "Failed to create organization. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Set up your Organization</CardTitle>
                    <CardDescription>Let's get your workspace ready.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                placeholder="Acme Corp"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                minLength={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                placeholder="Mumbai"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Setting up...
                                </>
                            ) : (
                                "Continue"
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
