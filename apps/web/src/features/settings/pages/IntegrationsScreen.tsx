import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
// import { getFunctions, httpsCallable } from "firebase/functions";
// import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Note: In a real app, use the Google Identity Services SDK or a library like @react-oauth/google
// For this MVP, we'll assume a standard OAuth2 flow where we redirect the user or open a popup.
// Since we need an 'offline' access code to get a refresh token for the backend, 
// we must use the 'code' flow.

export default function IntegrationsScreen() {
    const { claims } = useAuth();
    // const functions = getFunctions();
    const [isConnecting, setIsConnecting] = useState(false);

    // Check connection status
    const { data: gmbStatus, isLoading } = useQuery({
        queryKey: ["integration-status", "gmb"],
        queryFn: async () => {
            if (!claims?.tenant_id) return null;
            const docRef = doc(db, `tenants/${claims.tenant_id}/integrations/gmb`);
            const snap = await getDoc(docRef);
            return snap.exists() ? snap.data() : null;
        },
        enabled: !!claims?.tenant_id
    });

    // const connectGMBMutation = useMutation({ ... }); // Removed unused mutation

    const handleConnect = () => {
        setIsConnecting(true);
        // OAuth 2.0 Parameters
        const CLIENT_ID = import.meta.env.VITE_GMB_CLIENT_ID || "YOUR_CLIENT_ID"; // User needs to set this
        const REDIRECT_URI = window.location.origin + "/integrations/callback"; // We need a callback page
        // OR better for MVP: Use the Google Popup flow if we can get an offline code.
        // The simplest way for a 'popup' flow that returns a code is using the Google Client Library.

        // For MVP without installing heavy libraries, we construct the URL.
        const scope = "https://www.googleapis.com/auth/business.manage";
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

        // Redirect
        window.location.href = authUrl;
    };

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold font-heading text-slate-900">Integrations</h1>
                <p className="text-slate-500">Connect your external tools to CoCRM.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Google Business Profile Card */}
                <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span>Google Business Profile</span>
                            {gmbStatus && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                        </CardTitle>
                        <CardDescription>
                            Sync reviews, manage locations, and reply to customers directly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        ) : gmbStatus ? (
                            <div className="space-y-2">
                                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-md text-sm flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    Connected via {gmbStatus.accountId || 'Account'}
                                </div>
                                <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">Disconnect</Button>
                            </div>
                        ) : (
                            <Button
                                onClick={handleConnect}
                                disabled={isConnecting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Connect Google"}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Placeholder for future integrations */}
                <Card className="opacity-60 grayscale">
                    <CardHeader>
                        <CardTitle>WhatsApp Business API</CardTitle>
                        <CardDescription>Native WhatsApp integration provided by MSG91 (Configured in Settings).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button disabled variant="outline" className="w-full">Managed by System</Button>
                    </CardContent>
                </Card>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-100">
                <strong>Note:</strong> To test GMB integration, you must provide a valid `VITE_GMB_CLIENT_ID` in your `.env` file and set the Redirect URI to `{window.location.origin}/integrations/callback`.
            </div>
        </div>
    );
}
