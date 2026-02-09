
import { Phone, MessageCircle, ChevronRight, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { Lead } from "../types";
import { getHealthStatus, getHealthRingColor, getContextLine, getTimeAgo, logInteraction } from "../utils/leadUtils";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useCurrentTenant } from "@/features/auth/hooks/useCurrentTenant";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { QuickSendDrawer } from "./QuickSendDrawer";
import { useState } from "react";

interface LeadCardProps {
    lead: Lead;
}

export function LeadCard({ lead }: LeadCardProps) {
    const navigate = useNavigate();
    const { user, claims } = useAuth();
    const { data: tenant } = useCurrentTenant();
    const queryClient = useQueryClient();
    const [isQuickSendOpen, setIsQuickSendOpen] = useState(false);

    const thresholds = tenant?.config?.health_thresholds;
    const healthStatus = getHealthStatus(lead, thresholds);
    const ringColor = getHealthRingColor(healthStatus);
    const contextLine = getContextLine(lead, healthStatus);

    const handleInteraction = async (e: React.MouseEvent, type: 'whatsapp' | 'call' | 'email') => {
        e.stopPropagation();
        if (!user || !claims?.tenant_id) return;

        let actionLabel = "";
        if (type === 'whatsapp') {
            const phone = lead.business_details.phone?.replace(/\D/g, '');
            if (phone) window.open(`https://wa.me/${phone}`, '_blank');
            actionLabel = "Opened WhatsApp";
        } else if (type === 'call') {
            const phone = lead.business_details.phone;
            if (phone) window.open(`tel:${phone}`, '_self');
            actionLabel = "Initiated Call";
        }

        // Implicit Tracking: Log the interaction automatically
        await logInteraction(lead.id, claims.tenant_id, user.uid, type, actionLabel);

        // Invalidate queries to refresh the last_contacted_at immediately
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
        queryClient.invalidateQueries({ queryKey: ["interactions", lead.id] });

        toast.success(`Logged: ${actionLabel}`);
    };

    const handleReplied = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !claims?.tenant_id) return;

        await logInteraction(lead.id, claims.tenant_id, user.uid, 'whatsapp', "Lead Replied!");
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        toast.success("Great! Marked as Replied.");
    };

    const handleQuickSend = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsQuickSendOpen(true);
    };

    return (
        <>
            <div
                onClick={() => navigate(`/leads/${lead.id}`)}
                className="bg-white p-4 border-b border-slate-100 active:bg-slate-50 transition-colors cursor-pointer"
            >
                <div className="flex gap-4">
                    {/* Avatar with Health Ring */}
                    <div className="relative shrink-0">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-white bg-slate-400 border-[3px] ${ringColor}`}>
                            {lead.business_details.name.substring(0, 1)}
                        </div>
                        {healthStatus !== 'grey' && (
                            <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${ringColor.replace('border-', 'bg-')}`} />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-slate-900 truncate pr-2">
                                {lead.business_details.name}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                                {getTimeAgo(lead.last_contacted_at)}
                                <ChevronRight className="h-3 w-3" />
                            </div>
                        </div>

                        {/* Dynamic Context Line */}
                        <p className={`text-sm mt-0.5 truncate ${healthStatus === 'red' ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                            {contextLine}
                        </p>

                        {/* Badges Row */}
                        <div className="flex gap-2 mt-2 items-center">
                            {lead.business_details.opening_hours?.open_now && (
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5 py-0 h-5 font-normal border-0">
                                    Open Now
                                </Badge>
                            )}
                        </div>

                        {/* Inline Actions */}
                        <div className="flex gap-3 mt-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 flex-1 gap-1.5 text-slate-600 border-slate-200"
                                onClick={(e) => handleInteraction(e, 'whatsapp')}
                            >
                                <MessageCircle className="h-4 w-4 text-emerald-600" />
                                WhatsApp
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-10 px-0 border-slate-200"
                                onClick={(e) => handleInteraction(e, 'call')}
                            >
                                <Phone className="h-4 w-4 text-slate-600" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-10 px-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                onClick={handleQuickSend}
                            >
                                <Send className="h-4 w-4" />
                            </Button>

                            {lead.status === 'contacted' && (
                                <Button
                                    size="sm"
                                    className="h-8 bg-orange-100 text-orange-700 hover:bg-orange-200 border-0 flex-1"
                                    onClick={handleReplied}
                                >
                                    🔥 They Replied!
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <QuickSendDrawer
                open={isQuickSendOpen}
                onOpenChange={setIsQuickSendOpen}
                lead={lead}
            />
        </>
    );
}
