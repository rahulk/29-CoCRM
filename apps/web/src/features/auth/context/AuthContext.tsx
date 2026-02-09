import { createContext, useContext, useEffect, useState } from "react";
import { type User, onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    claims: Record<string, any> | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshClaims: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [claims, setClaims] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshClaims = async () => {
        if (auth.currentUser) {
            const tokenResult = await auth.currentUser.getIdTokenResult(true);
            setClaims(tokenResult.claims);
        }
    };

    useEffect(() => {
        // Use onIdTokenChanged to catch token refresh (e.g., new claims)
        const unsubscribe = onIdTokenChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                const tokenResult = await user.getIdTokenResult();
                setClaims(tokenResult.claims);
            } else {
                setClaims(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setClaims(null);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, claims, loading, signOut, refreshClaims }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
