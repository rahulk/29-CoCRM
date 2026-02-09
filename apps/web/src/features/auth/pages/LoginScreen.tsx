
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function LoginScreen() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate("/leads");
        }
    }, [user, navigate]);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // Redirect handled by useEffect
        } catch (error) {
            console.error("Login failed", error);
            toast.error("Google login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Redirect handled by useEffect
        } catch (error) {
            console.error("Login failed", error);
            toast.error("Invalid email or password.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email address.");
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setResetEmailSent(true);
            toast.success("Password reset email sent! Check your inbox.");
        } catch (error: any) {
            console.error("Reset failed", error);
            if (error.code === 'auth/user-not-found') {
                toast.error("No account found with this email.");
            } else {
                toast.error("Failed to send reset email. Try again later.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <span className="text-white font-bold text-xl">Co</span>
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 font-heading">
                    {isForgotPassword ? "Reset your password" : "Sign in to your account"}
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    {isForgotPassword ? (
                        "Enter your email and we'll send you a link to reset your password."
                    ) : (
                        <>
                            Or{' '}
                            <a href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                                start your 14-day free trial today
                            </a>
                        </>
                    )}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
                    {resetEmailSent ? (
                        <div className="text-center space-y-4">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                <Mail className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Check your email</h3>
                            <p className="text-sm text-slate-500">
                                We sent a password reset link to <strong>{email}</strong>.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => {
                                    setIsForgotPassword(false);
                                    setResetEmailSent(false);
                                }}
                            >
                                Back to Sign In
                            </Button>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={isForgotPassword ? handleForgotPassword : handleEmailLogin}>
                            <div>
                                <Label htmlFor="email">Email address</Label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                    </div>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="pl-10"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {!isForgotPassword && (
                                <div>
                                    <Label htmlFor="password">Password</Label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                        </div>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            className="pl-10"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="flex justify-end mt-1">
                                        <button
                                            type="button"
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 bg-transparent border-0 p-0"
                                            onClick={() => setIsForgotPassword(true)}
                                            disabled={isLoading}
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Button
                                    type="submit"
                                    className="w-full flex justify-center py-2 px-4 shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin h-5 w-5 text-white" />
                                    ) : (
                                        isForgotPassword ? "Send Reset Link" : "Sign in"
                                    )}
                                </Button>
                            </div>

                            {isForgotPassword && (
                                <div className="text-center">
                                    <button
                                        type="button"
                                        className="text-sm font-medium text-slate-600 hover:text-slate-900 bg-transparent border-0"
                                        onClick={() => setIsForgotPassword(false)}
                                        disabled={isLoading}
                                    >
                                        Back to Sign In
                                    </button>
                                </div>
                            )}
                        </form>
                    )}

                    {!isForgotPassword && !resetEmailSent && (
                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-slate-500">Or continue with</span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full flex justify-center items-center gap-2"
                                    onClick={handleGoogleLogin}
                                    disabled={isLoading}
                                >
                                    <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                                        <path
                                            d="M12.0003 20.45c4.65 0 8.55-3.15 9.94-7.58H12v-3.79h10.97c.18 1.05.29 2.15.29 3.29 0 5.61-3.9 10.38-9.26 10.38-5.38 0-9.86-3.79-11.16-8.86l3.96-3.07c.88 2.94 3.61 5.09 6.8 5.63z"
                                            fill="#4285F4"
                                            fillRule="evenodd"
                                        />
                                        <path
                                            d="M12.0003 3.58c2.31 0 4.38.83 5.96 2.29l2.84-2.84C18.91 1.25 15.65 0 12.0003 0 7.0203 0 2.6803 2.9 0 7.2l4.1303 3.08C5.2203 5.99 8.2803 3.58 12.0003 3.58z"
                                            fill="#EA4335"
                                            fillRule="evenodd"
                                        />
                                    </svg>
                                    Google
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
