
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";
import { useCurrentTenant } from "@/features/auth/hooks/useCurrentTenant";
import { useAuth } from "@/features/auth/context/AuthContext";
import { logInteraction } from "../utils/leadUtils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface QuickSendDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lead: any;
}

export function QuickSendDrawer({ open, onOpenChange, lead }: QuickSendDrawerProps) {
    const { data: tenant } = useCurrentTenant();
    const { user, claims } = useAuth();
    const queryClient = useQueryClient();

    if (!lead || !tenant) return null;

    const quickReplies = tenant.config?.quick_replies || [];

    const handleSend = (template: any) => {
        if (!user || !claims?.tenant_id) return;

        // 1. Prepare message (simple variable replacement if needed, for V1 we just use the text)
        // In real app, replace [LINK] with actual catalog link if stored in config
        const message = template.message;
        const phone = lead.business_details.phone?.replace(/\D/g, '');

        if (!phone) {
            toast.error("Lead has no phone number");
            return;
        }

        // 2. Open WhatsApp
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        // 3. Log Interaction
        logInteraction(lead.id, claims.tenant_id, user.uid, 'whatsapp', `Sent: ${template.label}`)
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ["leads"] });
                queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
                queryClient.invalidateQueries({ queryKey: ["interactions", lead.id] });
            });

        toast.success(`Sent ${template.label}`);
        onOpenChange(false);
    };

    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="bg-white flex flex-col rounded-t-[10px] fixed bottom-0 left-0 right-0 max-h-[85vh] z-50 focus:outline-none">
                    <div className="p-4 bg-white rounded-t-[10px] flex-1">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-200 mb-6" />

                        <div className="max-w-md mx-auto space-y-6 pb-10">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                                    Quick Send
                                </h3>
                                <p className="text-slate-500 text-sm">Send a pre-written message to {lead.business_details.name}.</p>
                            </div>

                            <div className="grid gap-3">
                                {quickReplies.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-lg">
                                        No quick replies configured.
                                        <br />
                                        <span className="text-xs">Go to Settings to add templates.</span>
                                    </div>
                                ) : (
                                    quickReplies.map((reply: any, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSend(reply)}
                                            className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition-all text-left group"
                                        >
                                            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                <Send className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-slate-900">{reply.label}</h4>
                                                <p className="text-xs text-slate-500 line-clamp-2">{reply.message}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="pt-2">
                                <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
