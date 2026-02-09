
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Search, ArrowRight, SkipForward } from "lucide-react";
import { discoverLeadsFn } from "@/lib/api";

export default function FirstSearchScreen() {
    const navigate = useNavigate();

    // State
    const [keyword, setKeyword] = useState("Gyms"); // Default suggestions
    const [location, setLocation] = useState("Mumbai"); // Default suggestions
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Geocoding (Mock for now or use browser/API if needed)
            let lat = 19.0760; // Mumbai Default
            let lng = 72.8777;

            // Simple mock for "Pune" or "Bangalore" to make it feel real?
            const loc = location.toLowerCase();
            if (loc.includes("pune")) { lat = 18.5204; lng = 73.8567; }
            if (loc.includes("bangalore")) { lat = 12.9716; lng = 77.5946; }
            if (loc.includes("delhi")) { lat = 28.7041; lng = 77.1025; }

            // Call Cloud Function
            const result: any = await discoverLeadsFn({
                keyword: keyword,
                location: { lat, lng },
                radius: 5000,
                preview_mode: true
            });

            if (result.data.success) {
                toast.success(`Found ${result.data.total_results_from_google} leads!`);
                navigate("/onboarding/preview");
            } else {
                setError("No results found. Try a different keyword.");
                toast.error("No results found.");
            }

        } catch (err: any) {
            console.error("Search failed:", err);
            const msg = err.message || "Search failed.";
            setError(msg);

            // If API is unavailable (likely misconfiguration), suggest skipping
            if (msg.includes("unavailable") || msg.includes("internal")) {
                toast.error("Search service is temporarily unavailable. You can skip this step.");
            } else {
                toast.error(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-2">
                    <Search className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Find Your Customers</h1>
                <p className="text-slate-500">Tell us who you want to reach, and we'll scan Google Maps for you.</p>
            </div>

            <Card className="shadow-lg border-slate-200">
                <form onSubmit={handleSearch}>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="keyword" className="text-sm font-medium">
                                    Business Type
                                </Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="keyword"
                                        placeholder="e.g. Gyms, Interior Designers, Cafes"
                                        className="pl-9 h-11"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location" className="text-sm font-medium">
                                    Target Location
                                </Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-0" /> {/* Spacer */}
                                    <Input
                                        id="location" // Spacer
                                        className="hidden"
                                    />
                                    <Input
                                        id="location"
                                        placeholder="e.g. Mumbai"
                                        className="h-11"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
                                <p className="font-medium">Search Failed</p>
                                <p>{error}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 pb-8">
                        <Button type="submit" className="w-full text-lg h-12 shadow-md transition-all hover:translate-y-[-1px]" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                <>
                                    Find Leads <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>

                        <div className="w-full pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-muted-foreground hover:text-primary text-sm font-normal"
                                onClick={() => navigate("/onboarding/activate")}
                            >
                                <SkipForward className="mr-2 h-4 w-4" />
                                Skip search, I'll add leads manually later
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
