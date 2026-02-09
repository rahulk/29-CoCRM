import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useLeads } from "@/features/leads/hooks/useLeads";
import { Loader2, CheckCircle2, Star, MapPin, Globe } from "lucide-react";



export default function LeadPreviewScreen() {
    const navigate = useNavigate();


    const { data: leads, isLoading, isError } = useLeads({ limit: 5 });

    const handleContinue = () => {
        navigate("/onboarding/activate");
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading your leads...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error Loading Leads</CardTitle>
                        <CardDescription>We couldn't load your preview. Please try refreshing.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Only show if we have leads, else maybe redirect to search?
    if (!leads || leads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>No Leads Found</CardTitle>
                        <CardDescription>It seems we couldn't find any leads matching your criteria.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={() => navigate("/onboarding/search")}>Try Another Search</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header / Hero */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="container max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">Here are 5 matches</h1>
                        <p className="text-sm text-muted-foreground">We found 150+ more in your area.</p>
                    </div>
                    <Button onClick={handleContinue} className="shadow-lg">
                        Start Free Trial
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
                {leads.map((lead) => (
                    <Card key={lead.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-lg">{lead.business_details.name}</h3>
                                    <div className="flex items-center text-sm text-muted-foreground mt-1 gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate max-w-[200px]">{lead.business_details.address}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-3">
                                        {lead.business_details.rating && (
                                            <div className="flex items-center bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium border border-yellow-200">
                                                <Star className="h-3 w-3 mr-1 fill-current" />
                                                {lead.business_details.rating} ({lead.business_details.review_count})
                                            </div>
                                        )}
                                        {lead.enrichment_status === 'pending' && (
                                            <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                <Globe className="h-3 w-3 mr-1" />
                                                Can Enrich
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Bottom Floating CTA on mobile */}
            <div className="fixed bottom-4 left-4 right-4 md:hidden">
                <Button onClick={handleContinue} size="lg" className="w-full shadow-xl">
                    Unlock All Leads (Start Trial)
                </Button>
            </div>
        </div>
    );
}
