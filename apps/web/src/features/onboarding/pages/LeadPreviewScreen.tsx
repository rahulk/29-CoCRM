import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useLeads } from "@/features/leads/hooks/useLeads";
import { Loader2, CheckCircle2, Star, MapPin, Globe } from "lucide-react";



export default function LeadPreviewScreen() {
    const navigate = useNavigate();


    const { data, isLoading, isError } = useLeads();
    const leads = data?.pages[0]?.leads.slice(0, 5) || [];

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
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">We found {leads.length > 0 ? '150+' : '0'} potential customers!</h1>
                <p className="text-slate-500">Here are a few matches from your area. Activate your trial to see them all.</p>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {leads.map((lead) => (
                    <Card key={lead.id} className="overflow-hidden hover:shadow-md transition-all border-slate-200 group">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-lg text-slate-900 group-hover:text-primary transition-colors">{lead.business_details.name}</h3>

                                    <div className="flex items-center text-sm text-slate-500 gap-1">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate max-w-[250px]">{lead.business_details.address}</span>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        {lead.business_details.rating && (
                                            <div className="flex items-center bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-medium border border-amber-200">
                                                <Star className="h-3 w-3 mr-1 fill-current" />
                                                {lead.business_details.rating} <span className="text-amber-600/70 ml-1">({lead.business_details.review_count})</span>
                                            </div>
                                        )}
                                        {lead.enrichment_status === 'pending' && (
                                            <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                <Globe className="h-3 w-3 mr-1" />
                                                Phone & Email Available
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="h-8 w-8 bg-green-50 rounded-full flex items-center justify-center text-green-600 shrink-0">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="pt-4">
                <Button onClick={handleContinue} className="w-full text-lg py-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5" size="lg">
                    Unlock All 150+ Leads (Start Free Trial)
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-3">
                    No credit card required • Cancel anytime
                </p>
            </div>
        </div>
    );
}
