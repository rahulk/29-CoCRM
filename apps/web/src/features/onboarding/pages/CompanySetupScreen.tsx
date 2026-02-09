
import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { createTenantFn } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Store, Briefcase, ShoppingBag, GraduationCap } from "lucide-react";
import { auth } from "@/lib/firebase";

type BusinessType = 'b2b_product' | 'b2c_product' | 'b2b_service' | 'b2c_service';

export default function CompanySetupScreen() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState<'details' | 'type'>('details');
    const [companyName, setCompanyName] = useState("");
    const [city, setCity] = useState("");
    const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleDetailsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStep('type');
    };

    const handleFinalSubmit = async () => {
        if (!user || !selectedType) return;

        setIsLoading(true);
        try {
            // 1. Create Tenant via Cloud Function
            await createTenantFn({
                company_name: companyName,
                city: city,
                admin_name: user.displayName || "Admin",
                business_type: selectedType,
            });

            // 2. Refresh Token to get new Custom Claims (tenant_id)
            await auth.currentUser?.getIdToken(true);

            toast.success("Organization created successfully!");
            navigate("/onboarding/search");

        } catch (error: any) {
            console.error("Error creating tenant:", error);
            toast.error(error.message || "Failed to create organization. Please try again.");
            setIsLoading(false);
        }
    };

    const businessTypes: { id: BusinessType, icon: any, label: string, desc: string }[] = [
        { id: 'b2c_product', icon: ShoppingBag, label: 'Retail / Shop', desc: 'Selling products to customers (e.g. Fashion, Electronics)' },
        { id: 'b2b_product', icon: Store, label: 'Wholesale / B2B', desc: 'Selling products to other businesses (e.g. Furniture Mfr)' },
        { id: 'b2c_service', icon: GraduationCap, label: 'Service (B2C)', desc: 'Serving individuals (e.g. Gym, Salon, Coaching)' },
        { id: 'b2b_service', icon: Briefcase, label: 'Agency / B2B', desc: 'Serving businesses (e.g. Marketing, Consulting)' },
    ];

    return (
        <div className="w-full max-w-lg mx-auto space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome to CoCRM</h1>
                <p className="text-slate-500">Let's set up your dedicated workspace to get started.</p>
            </div>

            {step === 'details' ? (
                <Card className="shadow-lg border-slate-200">
                    <CardHeader>
                        <CardTitle>Organization Details</CardTitle>
                        <CardDescription>This will be the name of your tenant.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleDetailsSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="companyName">Company Name</Label>
                                <Input
                                    id="companyName"
                                    placeholder="e.g. Acme Corp"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required
                                    minLength={2}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City / Location</Label>
                                <Input
                                    id="city"
                                    placeholder="e.g. Mumbai"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    required
                                    className="h-10"
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full text-base py-5 shadow-sm">
                                Next: Business Type
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            ) : (
                <Card className="shadow-lg border-slate-200">
                    <CardHeader>
                        <CardTitle>What matches your business?</CardTitle>
                        <CardDescription>We'll customize your experience based on this.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {businessTypes.map((type) => {
                            const Icon = type.icon;
                            const isSelected = selectedType === type.id;
                            return (
                                <div
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={`
                                        relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                        ${isSelected
                                            ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                            : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}
                                    `}
                                >
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-semibold ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>{type.label}</h3>
                                        <p className="text-xs text-slate-500">{type.desc}</p>
                                    </div>
                                    {isSelected && (
                                        <div className="h-4 w-4 rounded-full bg-indigo-600 shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                    <CardFooter className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep('details')} className="w-1/3">
                            Back
                        </Button>
                        <Button
                            onClick={handleFinalSubmit}
                            className="w-2/3 text-base py-5 shadow-sm bg-indigo-600 hover:bg-indigo-700"
                            disabled={!selectedType || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Workspace...
                                </>
                            ) : (
                                "Create Workspace"
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
