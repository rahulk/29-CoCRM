import { auth } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';

export default function ProfileScreen() {
    const navigate = useNavigate();
    const user = auth.currentUser;

    const handleSignOut = async () => {
        await auth.signOut();
        navigate('/login');
    };

    if (!user) {
        return <div>Please sign in.</div>;
    }

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">Profile</h1>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                            {user.displayName?.[0] || user.email?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <CardTitle>{user.displayName || "User"}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <p className="text-sm text-muted-foreground">User ID</p>
                        <code className="bg-muted p-2 rounded text-xs">{user.uid}</code>
                    </div>
                </CardContent>
            </Card>

            <Button variant="destructive" onClick={handleSignOut} className="w-full">
                Sign Out
            </Button>
        </div>
    );
}
