import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const version = import.meta.env.VITE_APP_VERSION || '1.0.0';

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await signInWithPopup(auth, googleProvider);
            navigate('/dashboard');
        } catch (error) {
            console.error("Google login error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch (error) {
            console.error("Email login error:", error);
            alert("Login failed " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4 flex-col">
            <div className="mb-8 cursor-pointer" onClick={() => navigate('/')}>
                <span className="text-primary font-bold text-3xl">CoCRM</span>
            </div>

            <Card className="w-full max-w-md shadow-lg border-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardHeader className="text-center space-y-1">
                    <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    <CardDescription>Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full h-11 relative" onClick={handleGoogleLogin} disabled={loading}>
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Sign in with Google
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11"
                            />
                            <div className="flex justify-end">
                                <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot password?</a>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-11" disabled={loading}>
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col justify-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Don't have an account? <a href="#" className="font-medium text-primary hover:underline ml-1">Sign up</a>
                    </div>
                </CardFooter>
            </Card>

            <div className="mt-8 text-center space-y-2">
                <p className="text-xs text-muted-foreground">Version {version}</p>
                <div className="flex gap-4 text-xs text-muted-foreground justify-center">
                    <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
                    <span>·</span>
                    <Link to="/terms" className="hover:underline">Terms of Service</Link>
                </div>
            </div>
        </div>
    );
}
