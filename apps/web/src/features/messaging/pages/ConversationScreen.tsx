import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFirestore, useFunctions } from "reactfire";
import { collection, query, onSnapshot, doc, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Send, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/context/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const ConversationScreen = () => {
    const { leadId } = useParams();
    const navigate = useNavigate();
    const { claims } = useAuth();
    const tenantId = claims?.tenant_id as string;
    const firestore = useFirestore();
    const functions = useFunctions();

    const [interactions, setInteractions] = React.useState<any[]>([]);
    const [lead, setLead] = React.useState<any>(null);
    const [messageText, setMessageText] = React.useState("");
    const [sending, setSending] = React.useState(false);

    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Fetch Lead Info
    React.useEffect(() => {
        if (!tenantId || !leadId) return;

        const unsub = onSnapshot(doc(firestore, `tenants/${tenantId}/leads/${leadId}`), (doc) => {
            if (doc.exists()) {
                setLead(doc.data());
                // Mark as read if needed
                if (doc.data().unread_count > 0) {
                    updateDoc(doc.ref, { unread_count: 0 });
                }
            }
        });

        return () => unsub();
    }, [tenantId, leadId, firestore]);

    // Fetch Messages
    React.useEffect(() => {
        if (!tenantId || !leadId) return;


        // Wait, if I do `collection(firestore, 'tenants/tid/interactions')`, I get all interactions for tenant.
        // I definitively need filtering.
        // Let's add the where clause.

        // Note: The backend logic in handleInboundMessage created interaction in `tenants/${tenantId}/interactions`.
        // So yes, it is flat.

        // TEMPORARY FIX: Start with client side filtering if volume is low, OR assume index exists.
        // Master Build Plan implies indexes are deployed.
        // `planning/2_Data_Schema.md` should have this index.
        // If query fails, I will see error in console and needing to create index.

        // But wait, creating complex index might take time.
        // Let's try simple query first.

        // I will use client side filtering for now to be safe if index missing, 
        // BUT `orderBy` makes it require an index with `where`.

        // Let's rely on the index.
    }, [tenantId, leadId, firestore]);

    // Re-doing the effect with correct query
    React.useEffect(() => {
        if (!tenantId || !leadId) return;

        // Assuming we have index on `lead_id` and `created_at`.
        // If not, we might fail. 
        // Strategy: Just filter by lead_id first, sort client side?
        // Firestore requires index for filtered query anyway if composite?
        // Single field index on lead_id is auto.

        // Let's try:
        // query(col, where("lead_id", "==", leadId)) -> works with auto index
        // Then client sort.

        const unsub = onSnapshot(query(
            collection(firestore, `tenants/${tenantId}/interactions`),
            where("lead_id", "==", leadId)
        ), (snapshot) => {
            const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort by created_at (client side to avoid index requirement for now)
            docs.sort((a: any, b: any) => (a.created_at?.seconds || 0) - (b.created_at?.seconds || 0));
            setInteractions(docs);

            // Scroll to bottom
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        return () => unsub();
    }, [tenantId, leadId, firestore]);


    const handleSend = async () => {
        if (!messageText.trim()) return;
        setSending(true);

        try {
            // For now, call sendWhatsapp callable. 
            // BUT wait, sendWhatsapp expects a TEMPLATE.
            // Free form text is not supported by WhatsApp Business API unless it's a response within 24h window.
            // Phase 3.1 `sendWhatsapp` was strictly Template based for initiation.

            // To support session messages (free text), we need to update backend or use a "session_text" parameter?
            // MSG91 v5 API for session message? 
            // The adapter `msg91Adapter.ts` expects `templateName`.

            // Implementation Guide `WHATSAPP_IMPLEMENTATION_GUIDE.md` focused on BULK/Template.
            // If I want to send free text, I might need a different endpoint or "Session Message" logic.

            // For this version (Phase 3.2), let's assume we can ONLY send Templates for outbound initiation.
            // Or maybe we treat this input as "Send a pseudo-template" or just log it?

            // Re-reading `ConversationScreen` plan:
            // "Input: Send Template button (opens drawer) + Text input (disabled if 24h window closed? Optional)."

            // So I should have a Template Picker.
            // The text input might be for "Notes" or strictly session messages if allowed.

            // Let's implement the "Send Template" button separately.
            // For the text input, if I leave it enabled, I should try to send it as a "text" message if adapter supports it.
            // My adapter currently enforces template structure.

            // Let's disable the text input with a placeholder "Use Template to start conversation" or just keep it for now.

            // Actually, let's just create a quick "Echo" for demo if session not supported, 
            // or just assume the user will use the "Send Info" button from lead card for now?

            // Strategy: I will provide a simple "Send Template" button that triggers a hardcoded template for now (e.g. "hello_world")
            // Or just make it sending a generic text if I update adapter.

            // Let's stick to the plan: "Send Template" button.
            // I will add a simple button "Send Template" that just mocks sending 'hello_world' for testing.

            const sendWhatsappFn = httpsCallable(functions, 'sendWhatsapp');
            await sendWhatsappFn({
                leadId,
                templateName: "hello_world", // Default dev template
                templateData: { name: lead?.name || "Customer" }
            });

            setMessageText("");

        } catch (err) {
            console.error(err);
            alert("Failed to send");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="font-semibold">{lead?.name || "Loading..."}</h2>
                        <span className="text-xs text-muted-foreground">{lead?.phone}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" asChild>
                        <a href={`tel:${lead?.phone}`}>
                            <Phone className="h-5 w-5" />
                        </a>
                    </Button>
                    {/* <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                    </Button> */}
                </div>
            </header>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {interactions.map((msg) => {
                    const isOutbound = msg.type === "whatsapp_outbound";
                    const isSystem = !msg.type || msg.type === "system"; // e.g. credit log?

                    if (isSystem && !msg.content) return null;

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex w-full mb-2",
                                isOutbound ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "max-w-[80%] rounded-lg p-3 text-sm shadow-sm",
                                isOutbound
                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                    : "bg-white border rounded-bl-none"
                            )}>
                                <p>{msg.content || JSON.stringify(msg.metadata)}</p>
                                <span className={cn(
                                    "text-[10px] block mt-1 opacity-70",
                                    isOutbound ? "text-primary-foreground" : "text-muted-foreground"
                                )}>
                                    {msg.created_at?.toDate ? format(msg.created_at.toDate(), "p") : "Just now"}
                                    {isOutbound && (
                                        <span className="ml-1">
                                            {msg.status === "sent" ? "✓" : msg.status === "delivered" ? "✓✓" : "•"}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t p-3 flex gap-2 items-center sticky bottom-0">
                {/* Template Button Placeholder */}
                <Button variant="outline" size="sm" onClick={handleSend} disabled={sending}>
                    Template
                </Button>

                <Input
                    placeholder="Type a message (Session requires 24h window)..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1"
                    disabled // Disabled for now as we only have template support in backend
                />

                <Button size="icon" disabled>
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
