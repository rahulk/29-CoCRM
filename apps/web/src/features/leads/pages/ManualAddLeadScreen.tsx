
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Building2, MapPin, Phone, Globe } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function ManualAddLeadScreen() {
    const navigate = useNavigate();
    const { claims, user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        website: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!claims?.tenant_id || !user?.uid) {
            toast.error("You must be logged in to add leads.");
            return;
        }

        setIsLoading(true);

        try {
            // Construct Lead Object
            const leadData = {
                tenant_id: String(claims.tenant_id),
                source: "manual",
                status: "new",

                // Allowable fields
                business_details: {
                    name: formData.name.trim(),
                    address: formData.address.trim(),
                    phone: formData.phone.trim(),
                    website: formData.website.trim(),
                    rating: 0,
                    review_count: 0
                },

                // Fields below are NOT in blocked list for create
                is_archived: false,

                // Audit Fields
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                created_by: user.uid,
                updated_by: user.uid
            };

            await addDoc(collection(db, "leads"), leadData);

            toast.success("Lead added successfully!");
            navigate("/leads");

        } catch (error: any) {
            console.error("Error adding lead:", error);
            if (error.code === 'permission-denied') {
                toast.error("Permission denied. Check if you have entered restricted fields.");
            } else {
                toast.error("Failed to add lead.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center gap-2 sticky top-0">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-semibold">Add Lead Manually</h1>
            </div>

            <div className="p-4 flex-1">
                <Card className="max-w-lg mx-auto">
                    <CardHeader>
                        <CardTitle>Business Details</CardTitle>
                        <CardDescription>Enter the details of the business you want to add.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Business Name *</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        placeholder="e.g. Acme Corp"
                                        className="pl-9"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        minLength={2}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="address"
                                        placeholder="e.g. 123 Main St, Mumbai"
                                        className="pl-9"
                                        value={formData.address}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        placeholder="e.g. +91 98765 43210"
                                        className="pl-9"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="website"
                                        placeholder="e.g. https://example.com"
                                        className="pl-9"
                                        value={formData.website}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    "Add Lead"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
