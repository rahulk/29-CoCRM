import { useQuery } from "@tanstack/react-query";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { Lead } from "../types";

/**
 * Fetches ALL active (non-archived) leads for the tenant.
 * Used by the Smart Feed (urgency-grouped view) and Morning Briefing.
 * Unlike useLeads (paginated), this loads everything for client-side grouping.
 */
export function useAllLeads() {
    const { claims } = useAuth();
    const tenantId = claims?.tenant_id;

    return useQuery({
        queryKey: ["all-leads", tenantId],
        queryFn: async () => {
            if (!tenantId) return [];

            const q = query(
                collection(db, "leads"),
                where("tenant_id", "==", tenantId),
                orderBy("created_at", "desc")
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
        },
        enabled: !!tenantId,
        staleTime: 30_000, // 30s — avoids refetching on every tab switch
    });
}
