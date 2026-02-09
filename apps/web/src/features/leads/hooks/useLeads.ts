import { useInfiniteQuery } from "@tanstack/react-query";
import { collection, query, where, orderBy, getDocs, limit, startAfter, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { Lead } from "../types";

const LEADS_PER_PAGE = 20;

export function useLeads(params?: { status?: string }) {
    const { claims } = useAuth();
    const tenantId = claims?.tenant_id;

    return useInfiniteQuery({
        queryKey: ["leads", tenantId, params?.status],
        queryFn: async ({ pageParam }) => {
            if (!tenantId) return { leads: [], lastDoc: null };

            try {
                let q = query(
                    collection(db, "leads"),
                    where("tenant_id", "==", tenantId),
                    orderBy("created_at", "desc"),
                    limit(LEADS_PER_PAGE)
                );

                if (params?.status && params.status !== 'all') {
                    q = query(q, where("status", "==", params.status));
                }

                if (pageParam) {
                    q = query(q, startAfter(pageParam));
                }

                const snapshot = await getDocs(q);
                const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
                const lastDoc = snapshot.docs[snapshot.docs.length - 1];

                return { leads, lastDoc };
            } catch (error) {
                console.error("Error fetching leads:", error);
                throw error;
            }
        },
        getNextPageParam: (lastPage) => lastPage.lastDoc || undefined,
        initialPageParam: undefined as QueryDocumentSnapshot | undefined,
        enabled: !!tenantId,
    });
}
