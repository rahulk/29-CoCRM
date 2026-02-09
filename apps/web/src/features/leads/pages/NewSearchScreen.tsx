
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Search, ArrowLeft, MapPin } from "lucide-react";
import { discoverLeadsFn } from "@/lib/api"; // Ensure this matches existing import in FirstSearchScreen

export default function NewSearchScreen() {
    const navigate = useNavigate();

    // State
    const [keyword, setKeyword] = useState("");
    const [location, setLocation] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Mock Geocoding Logic (reused from FirstSearchScreen)
            // TODO: Move to shared utility
            let lat = 19.0760; // Mumbai Default
            let lng = 72.8777;

            const loc = location.toLowerCase();
            if (loc.includes("pune")) { lat = 18.5204; lng = 73.8567; }
            if (loc.includes("bangalore")) { lat = 12.9716; lng = 77.5946; }
            if (loc.includes("delhi")) { lat = 28.7041; lng = 77.1025; }

            // Call Cloud Function (FULL MODE)
            const result: any = await discoverLeadsFn({
                keyword: keyword,
                location: { lat, lng },
                radius: 5000,
                preview_mode: false
            });

            if (result.data.success) {
                toast.success(`Found and saved ${result.data.leads_saved} new leads!`);
                // Go back to Lead List
                navigate("/leads");
            } else {
                toast.error("No results found. Try a different keyword.");
            }

        } catch (error: any) {
            console.error("Search failed:", error);
            const msg = error.details?.message || error.message || "Search failed.";

            // Handle Quota Error specifically
            if (msg.includes("Quota")) {
                toast.error("Monthly limit reached. Please upgrade.");
            } else {
                toast.error(msg);
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
                <h1 className="text-lg font-semibold">Find New Leads</h1>
            </div>

            <div className="p-4 flex-1">
                <Card>
                    <CardContent className="pt-6 space-y-6">
                        <form onSubmit={handleSearch} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="keyword">Business Type</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="keyword"
                                        placeholder="e.g. Interior Designers"
                                        className="pl-9"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Target City</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="location"
                                        placeholder="e.g. Mumbai"
                                        className="pl-9"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Searching...
                                    </>
                                ) : (
                                    "Find & Save Leads"
                                )}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                Leads will be verified and added to your list automatically.
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
