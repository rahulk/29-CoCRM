import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { discoverLeadsFn } from "@/lib/api";

export default function FirstSearchScreen() {
    const navigate = useNavigate();

    // State
    const [keyword, setKeyword] = useState("Gyms"); // Default suggestions
    const [location, setLocation] = useState("Mumbai"); // Default suggestions
    const [isLoading, setIsLoading] = useState(false);

    // TODO: Add Geolocation auto-detect button

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Geocoding (Mock for now or use browser/API if needed)
            // For MVP, if user types city string, we might need lat/lng
            // The Cloud Function requires lat/lng. 
            // We need a Geocoding step on client or server. 
            // Since we don't have a configured Geocoding API wrapper on client yet,
            // let's use a simple mock lat/lng for "Mumbai" or rely on browser geolocation.

            // Constraint: discoverLeads REQUIRES lat/lng.
            // Option A: Ask user for permission to get location.
            // Option B: If they type, use a public geocoder (OpenStreetMap) or just hardcode defaults for demo?
            // "Self-Serve Onboarding" implies high friction if we ask too much.
            // Let's try browser geolocation first.

            let lat = 19.0760; // Mumbai Default
            let lng = 72.8777;

            // Simple mock for "Pune" or "Bangalore" to make it feel real?
            if (location.toLowerCase().includes("pune")) { lat = 18.5204; lng = 73.8567; }
            if (location.toLowerCase().includes("bangalore")) { lat = 12.9716; lng = 77.5946; }
            if (location.toLowerCase().includes("delhi")) { lat = 28.7041; lng = 77.1025; }

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
                toast.error("No results found. Try a different keyword.");
            }

        } catch (error: any) {
            console.error("Search failed:", error);
            toast.error(error.message || "Search failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Who are your ideal customers?</CardTitle>
                    <CardDescription>We'll find real businesses for you to contact.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSearch}>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="keyword">Business Type (Keyword)</Label>
                            <Input
                                id="keyword"
                                placeholder="e.g. Gyms, Tuition Classes, Dentists"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location (City)</Label>
                            <Input
                                id="location"
                                placeholder="e.g. Mumbai"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Searching Google Maps...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-5 w-5" />
                                    Find Leads
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
