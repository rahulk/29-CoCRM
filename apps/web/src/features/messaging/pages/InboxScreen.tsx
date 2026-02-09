import React from "react";
import { useFirestore } from "reactfire";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/context/AuthContext";

export const InboxScreen = () => {
    const { claims } = useAuth();
    const tenantId = claims?.tenant_id as string;
    const firestore = useFirestore();
    const [leads, setLeads] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");

    React.useEffect(() => {
        if (!tenantId) return;

        // Query leads with recent interactions
        // Requires index: tenantId ASC, last_interaction_at DESC
        const q = query(
            collection(firestore, `tenants/${tenantId}/leads`),
            where("last_interaction_at", ">", new Date(0)), // Filter for leads with interactions
            orderBy("last_interaction_at", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeads(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId, firestore]);

    const filteredLeads = leads.filter(lead =>
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm)
    );

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-4 pb-20">
            <h1 className="text-2xl font-bold">Inbox</h1>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search messages..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Loading...</div>
            ) : filteredLeads.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No messages yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredLeads.map((lead) => (
                        <Link
                            key={lead.id}
                            to={`/messages/${lead.id}`}
                            className="block bg-card p-4 rounded-lg border shadow-sm hover:bg-accent/5 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-semibold truncate">{lead.name || "Unknown"}</h3>
                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                    {lead.last_interaction_at?.toDate ? formatDistanceToNow(lead.last_interaction_at.toDate(), { addSuffix: true }) : ""}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{lead.last_interaction_content || "Attachment or Template"}</p>
                            {lead.unread_count > 0 && (
                                <div className="mt-2">
                                    <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                        {lead.unread_count} new
                                    </span>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};
