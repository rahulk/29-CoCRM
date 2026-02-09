import { useQuery } from "@tanstack/react-query";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/context/AuthContext";

// Define Lead Interface (Partial)
export interface Lead {
    id: string;
    business_details: {
        name: string;
        address: string;
        phone: string;
        website: string;
        rating?: number;
        review_count?: number;
    };
    contact_details: {
        email?: string;
        social?: any;
    };
    status: string;
    enrichment_status: string;
    created_at: any;
}

export function useLeads(params?: { limit?: number }) {
    const { claims } = useAuth();
    const tenantId = claims?.tenant_id;

    return useQuery({
        queryKey: ["leads", tenantId, params?.limit],
        queryFn: async () => {
            if (!tenantId) return [];

            try {
                // Index requirement: tenant_id ASC, created_at DESC
                const q = query(
                    collection(db, "leads"),
                    where("tenant_id", "==", tenantId),
                    orderBy("created_at", "desc"),
                    ...(params?.limit ? [limit(params.limit)] : [])
                );

                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
            } catch (error) {
                console.error("Error fetching leads:", error);
                throw error;
            }
        },
        enabled: !!tenantId, // Only run if tenantId is available
    });
}
