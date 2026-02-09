
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Link, useNavigate } from "react-router-dom";

export default function SignUpScreen() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            toast.error("Please fill in all fields.");
            return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Create User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // 2. Update Profile with Name
            await updateProfile(userCredential.user, {
                displayName: name
            });

            toast.success("Account created successfully!");
            // 3. Redirect to Onboarding
            navigate("/onboarding");
        } catch (error: any) {
            console.error("Sign up failed", error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error("This email is already registered. Please sign in.");
            } else if (error.code === 'auth/weak-password') {
                toast.error("Password is too weak.");
            } else {
                toast.error("Failed to create account. Please try again.");
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
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Sign in
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
                    <form className="space-y-6" onSubmit={handleSignUp}>
                        <div>
                            <Label htmlFor="name">Full Name</Label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" aria-hidden="true" />
                                </div>
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    className="pl-10"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

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
                                    autoComplete="new-password"
                                    required
                                    className="pl-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <Button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                                ) : (
                                    "Sign Up"
                                )}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-slate-500">By signing up, you agree to our</span>
                            </div>
                        </div>
                        <div className="mt-2 text-center text-xs text-slate-500">
                            <Link to="/terms" className="underline hover:text-indigo-600">Terms of Service</Link>
                            {' '}and{' '}
                            <Link to="/privacy" className="underline hover:text-indigo-600">Privacy Policy</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
