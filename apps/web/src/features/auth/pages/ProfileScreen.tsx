import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function ProfileScreen() {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || "");
            setPhoneNumber(user.phoneNumber || "");
        }
    }, [user]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);

        try {
            // 1. Update Firebase Auth Profile (Display Name only)
            await updateProfile(user, { displayName });

            // 2. Call Cloud Function to update Firestore user document (Name, Phone + Audit)
            const updateUserProfile = httpsCallable(functions, "updateUserProfile");
            await updateUserProfile({ name: displayName, phone: phoneNumber });

            toast.success("Profile updated successfully.");
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to update profile.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <AppShell>
                <div className="flex items-center justify-center p-8">Loading...</div>
            </AppShell>
        );
    }

    return (
        <div className="container max-w-lg py-8 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.photoURL || ""} />
                            <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>Your Profile</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                disabled={isLoading}
                                placeholder="+91..."
                            />
                            <p className="text-xs text-muted-foreground">Used for account recovery and notifications.</p>
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
