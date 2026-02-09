
import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Phone, Lock, LogOut } from "lucide-react";
import { toast } from "sonner";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { updatePassword } from "firebase/auth";

export default function ProfileScreen() {
    const { user, claims, signOut } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Form States
    const [name, setName] = useState(user?.displayName || "");
    const [phone, setPhone] = useState(user?.phoneNumber || "");

    // Password States
    const [isChangePassword, setIsChangePassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
            await updateUserProfile({ name, phone });
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        try {
            if (user) {
                await updatePassword(user, newPassword);
                toast.success("Password updated successfully!");
                setIsChangePassword(false);
                setNewPassword("");
                setConfirmPassword("");
            }
        } catch (error: any) {
            console.error("Error updating password:", error);
            if (error.code === 'auth/requires-recent-login') {
                toast.error("Security check failed. Please sign out and sign in again.");
            } else {
                toast.error("Failed to update password.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            toast.success("Signed out successfully.");
        } catch (error) {
            toast.error("Failed to sign out.");
        }
    };

    if (!user) return null;

    const isEmailUser = user.providerData.some(p => p.providerId === 'password');

    return (
        <div className="pb-24 pt-4 px-4 space-y-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>

            {/* Identity Card */}
            <Card>
                <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-700">
                            {user.displayName?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-left space-y-1">
                        <h2 className="text-xl font-bold text-slate-900">{user.displayName || "User"}</h2>
                        <p className="text-sm text-slate-500 flex items-center justify-center md:justify-start gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {user.email}
                        </p>
                        <div className="flex items-center justify-center md:justify-start gap-2 pt-1">
                            {claims?.role && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                                    ${claims.role === 'tenant_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {claims.role.replace('_', ' ')}
                                </span>
                            )}
                            <span className="text-xs text-slate-400">
                                Joined {new Date(user.metadata.creationTime || Date.now()).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-400">
                                Last Login {new Date(user.metadata.lastSignInTime || Date.now()).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Profile Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Personal Details</CardTitle>
                    <CardDescription>Update your contact information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="pl-9"
                                    placeholder="+1234567890"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Password Section (Email Users Only) */}
            {isEmailUser && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Lock className="h-5 w-5 text-slate-500" />
                            Password
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isChangePassword ? (
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirm Password</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <Button type="button" variant="ghost" onClick={() => setIsChangePassword(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isLoading}>
                                        Update Password
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Change Password</p>
                                    <p className="text-xs text-slate-500">Update your login credentials.</p>
                                </div>
                                <Button variant="outline" onClick={() => setIsChangePassword(true)}>
                                    Change
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Account Actions */}
            <div className="space-y-3">
                <Button variant="destructive" className="w-full bg-red-50 text-red-600 hover:bg-red-100 border-red-200" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
