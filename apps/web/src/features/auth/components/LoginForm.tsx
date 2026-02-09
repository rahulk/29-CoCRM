import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isForgotPassword) {
                await sendPasswordResetEmail(auth, email);
                toast.success("Password reset email sent.");
                setIsForgotPassword(false);
            } else if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
                toast.success("Account created successfully!");
                navigate("/onboarding/company"); // Redirect to onboarding
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                toast.success("Logged in successfully.");
                navigate("/leads");
            }
        } catch (error: any) {
            console.error(error);
            let message = "An error occurred.";
            if (error.code === 'auth/email-already-in-use') message = "Email already in use.";
            if (error.code === 'auth/invalid-credential') message = "Invalid email or password.";
            if (error.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
            toast.success("Logged in with Google.");
            navigate("/leads");
        } catch (error: any) {
            console.error(error);
            toast.error("Google sign-in failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsForgotPassword(false);
        setIsSignUp(!isSignUp);
    };

    return (
        <Card className="w-full max-w-sm mx-auto">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">
                    {isForgotPassword ? "Reset Password" : isSignUp ? "Create an Account" : "Login"}
                </CardTitle>
                <CardDescription>
                    {isForgotPassword
                        ? "Enter your email to receive a reset link."
                        : isSignUp
                            ? "Enter your email below to create your account"
                            : "Enter your email below to login to your account"}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                {!isForgotPassword && (
                    <div className="grid grid-cols-1 gap-6">
                        <Button variant="outline" onClick={handleGoogleLogin} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                                </svg>
                            )}
                            {isSignUp ? "Sign up with Google" : "Login with Google"}
                        </Button>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <div className="grid gap-1">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                        {!isForgotPassword && (
                            <div className="grid gap-1">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        )}
                        <Button className="mt-4 w-full" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isForgotPassword ? "Send Reset Link" : isSignUp ? "Create Account" : "Login"}
                        </Button>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                {!isSignUp && (
                    <Button variant="link" className="w-full" onClick={() => setIsForgotPassword(!isForgotPassword)}>
                        {isForgotPassword ? "Back to Login" : "Forgot Password?"}
                    </Button>
                )}
                <Button variant="ghost" className="w-full" onClick={toggleMode}>
                    {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
                </Button>
            </CardFooter>
        </Card>
    );
}
