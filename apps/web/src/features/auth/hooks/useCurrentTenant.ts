import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface Tenant {
    id: string;
    subscription_status: string;
    onboarding_step: string;
    usage_current: any;
    usage_limits: any;
}

export function useCurrentTenant() {
    const { claims } = useAuth();
    const tenantId = claims?.tenant_id as string | undefined;
    const queryClient = useQueryClient();

    // Use React Query for caching, but listen to snapshot for real-time changes (e.g., usage updates)
    // Actually, just fetching is cleaner for routing guards. Real-time helps with credits/usage.
    // Let's wrapping onSnapshot in useEffect to update query cache.

    useEffect(() => {
        if (!tenantId) return;

        const unsubscribe = onSnapshot(doc(db, "tenants", tenantId), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = { id: docSnapshot.id, ...docSnapshot.data() } as Tenant;
                queryClient.setQueryData(["tenant", tenantId], data);
            }
        });

        return () => unsubscribe();
    }, [tenantId, queryClient]);

    return useQuery({
        queryKey: ["tenant", tenantId],
        queryFn: async () => {
            if (!tenantId) return null;
            const docRef = doc(db, "tenants", tenantId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Tenant;
            }
            return null;
        },
        enabled: !!tenantId,
        staleTime: Infinity, // Rely on snapshot to update
    });
}
