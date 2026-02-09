import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, updateDoc, collection, serverTimestamp, query, where, orderBy, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import type { Lead } from "@/features/leads/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Phone, Mail, Globe, MapPin, MessageSquare, Sparkles, Building2, Archive, MoreVertical, Send, Flame, Star } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { logInteraction, STATUS_CONFIG, getHealthStatus, getHealthRingColor, getTimeAgo } from "../utils/leadUtils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LeadDetailScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const functions = getFunctions();
    const { user, claims } = useAuth();
    const [noteContent, setNoteContent] = useState("");

    // Fetch Lead
    const { data: lead, isLoading, error } = useQuery({
        queryKey: ["lead", id],
        queryFn: async () => {
            if (!id) throw new Error("No ID");
            const snap = await getDoc(doc(db, "leads", id));
            if (!snap.exists()) throw new Error("Lead not found");
            return { id: snap.id, ...snap.data() } as Lead;
        },
        enabled: !!id
    });

    // Fetch Interactions (all types, not just notes)
    const { data: interactions } = useQuery({
        queryKey: ["interactions", id],
        queryFn: async () => {
            if (!id || !claims?.tenant_id) return [];
            const q = query(
                collection(db, "interactions"),
                where("lead_id", "==", id),
                orderBy("created_at", "desc")
            );
            const snaps = await getDocs(q);
            return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        enabled: !!id && !!claims?.tenant_id
    });

    // Update Status Mutation
    const updateStatusMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            if (!id || !user) return;
            await updateDoc(doc(db, "leads", id), {
                status: newStatus,
                updated_at: serverTimestamp(),
                updated_by: user.uid,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lead", id] });
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success("Status updated");
        }
    });

    // Add Note Mutation
    const addNoteMutation = useMutation({
        mutationFn: async () => {
            if (!id || !user || !noteContent.trim() || !claims?.tenant_id) return;
            await logInteraction(id, claims.tenant_id, user.uid, 'note', noteContent);
        },
        onSuccess: () => {
            setNoteContent("");
            queryClient.invalidateQueries({ queryKey: ["interactions", id] });
            queryClient.invalidateQueries({ queryKey: ["lead", id] });
            toast.success("Note added");
        },
        onError: () => toast.error("Failed to add note")
    });

    // Archive Mutation
    const archiveMutation = useMutation({
        mutationFn: async () => {
            if (!id || !user) return;
            await updateDoc(doc(db, "leads", id), {
                is_archived: true,
                archived_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                updated_by: user.uid,
            });
        },
        onSuccess: () => {
            toast.success("Lead archived");
            navigate("/leads");
        },
        onError: () => toast.error("Failed to archive lead")
    });

    // Enrich Mutation
    const enrichMutation = useMutation({
        mutationFn: async () => {
            if (!id) return;
            const enrichLeads = httpsCallable(functions, 'enrichLeads');
            const result: any = await enrichLeads({ leadId: id });
            if (!result.data.success) {
                throw new Error(result.data.message || "Enrichment failed");
            }
            return result.data;
        },
        onSuccess: () => {
            toast.success("Enrichment started! Check back in a moment.");
            queryClient.invalidateQueries({ queryKey: ["lead", id] });
        },
        onError: (err: any) => {
            console.error(err);
            toast.error(err.message || "Failed to start enrichment");
        }
    });

    // Action handlers with implicit tracking
    const handleWhatsApp = () => {
        if (!lead || !user || !claims?.tenant_id) return;
        const phone = lead.business_details.phone?.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}`, '_blank');
        logInteraction(lead.id, claims.tenant_id, user.uid, 'whatsapp')
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ["lead", id] });
                queryClient.invalidateQueries({ queryKey: ["interactions", id] });
            });
        toast.success("📱 WhatsApp opened — interaction logged");
    };

    const handleCall = () => {
        if (!lead || !user || !claims?.tenant_id) return;
        window.open(`tel:${lead.business_details.phone}`, '_self');
        logInteraction(lead.id, claims.tenant_id, user.uid, 'call')
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ["lead", id] });
                queryClient.invalidateQueries({ queryKey: ["interactions", id] });
            });
        toast.success("📞 Call initiated — interaction logged");
    };

    const handleEmail = () => {
        if (!lead || !user || !claims?.tenant_id) return;
        window.open(`mailto:${lead.contact_details?.email}`, '_self');
        logInteraction(lead.id, claims.tenant_id, user.uid, 'email')
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ["lead", id] });
                queryClient.invalidateQueries({ queryKey: ["interactions", id] });
            });
    };

    const handleTheyReplied = () => {
        if (!lead || !user || !claims?.tenant_id) return;
        updateStatusMutation.mutate('responded');
        logInteraction(lead.id, claims.tenant_id, user.uid, 'note', 'Lead replied (marked by owner)');
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
    if (error || !lead) return <div className="p-10 text-center text-slate-500">Lead not found</div>;

    const health = getHealthStatus(lead);
    const healthColor = getHealthRingColor(health);
    const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG['new'];
    const statuses = ['new', 'contacted', 'responded', 'converted', 'lost'];

    // Interaction type icons for timeline
    const getInteractionIcon = (type: string) => {
        switch (type) {
            case 'whatsapp': return '📱';
            case 'call': return '📞';
            case 'email': return '✉️';
            default: return '📝';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 sticky top-0 z-20 shadow-sm flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Button>
                <div className="relative shrink-0">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm border-2 ${health === 'green' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
                        health === 'yellow' ? 'border-amber-400 bg-amber-50 text-amber-700' :
                            health === 'red' ? 'border-red-400 bg-red-50 text-red-700' :
                                'border-slate-300 bg-slate-50 text-slate-500'
                        }`}>
                        {lead.business_details.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${healthColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-lg text-slate-900 truncate">{lead.business_details.name}</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Badge variant="outline" className={`${statusConfig.color} border px-1.5 py-0 h-4 text-[10px] font-medium`}>
                            {statusConfig.emoji} {statusConfig.label}
                        </Badge>
                        {lead.business_details.rating && (
                            <span className="flex items-center gap-0.5 text-amber-600">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {lead.business_details.rating}
                                {lead.business_details.review_count && (
                                    <span className="text-slate-400"> ({lead.business_details.review_count})</span>
                                )}
                            </span>
                        )}
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreVertical className="h-5 w-5 text-slate-600" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => archiveMutation.mutate()} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Archive className="mr-2 h-4 w-4" />
                            Archive Lead
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="max-w-3xl mx-auto p-4 space-y-4">

                {/* Status Progress Bar */}
                <div className="bg-white p-1 rounded-full border shadow-sm flex overflow-x-auto no-scrollbar">
                    {statuses.map((status) => {
                        const isActive = lead.status === status;
                        const config = STATUS_CONFIG[status];
                        return (
                            <button
                                key={status}
                                onClick={() => updateStatusMutation.mutate(status)}
                                className={`flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all whitespace-nowrap
                                    ${isActive
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                {config?.emoji} {config?.label || status}
                            </button>
                        );
                    })}
                </div>

                {/* "They Replied!" CTA for contacted leads */}
                {lead.status === 'contacted' && (
                    <Button
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-200 h-12 text-base font-semibold rounded-xl"
                        onClick={handleTheyReplied}
                        disabled={updateStatusMutation.isPending}
                    >
                        <Flame className="mr-2 h-5 w-5" />
                        🔥 They Replied! Mark as Interested
                    </Button>
                )}

                {/* Primary Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Button
                        size="lg"
                        className="col-span-2 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-100 border-green-700 h-12 text-base"
                        onClick={handleWhatsApp}
                        disabled={!lead.business_details.phone}
                    >
                        <MessageSquare className="mr-2 h-5 w-5" />
                        WhatsApp
                    </Button>
                    <Button variant="outline" size="lg" className="bg-white hover:bg-slate-50 border-slate-200 h-12" onClick={handleCall} disabled={!lead.business_details.phone}>
                        <Phone className="mr-2 h-4 w-4 text-slate-600" /> Call
                    </Button>
                    <Button variant="outline" size="lg" className="bg-white hover:bg-slate-50 border-slate-200 h-12" onClick={handleEmail} disabled={!lead.contact_details?.email}>
                        <Mail className="mr-2 h-4 w-4 text-slate-600" /> Email
                    </Button>
                </div>

                {/* Smart Assistant Card */}
                <Card className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 shadow-sm overflow-hidden">
                    <CardHeader className="pb-3 border-b border-indigo-100/50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base text-indigo-900 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                Smart Insight
                            </CardTitle>
                            {lead.ai_analysis?.score && (
                                <Badge className="bg-indigo-600 hover:bg-indigo-700 border-0">
                                    Score: {lead.ai_analysis.score}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {lead.enrichment_status === 'processing' ? (
                            <div className="flex items-center gap-3 text-sm text-indigo-700 animate-pulse">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Analyzing business data...
                            </div>
                        ) : lead.ai_analysis?.summary ? (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-700 leading-relaxed">{lead.ai_analysis.summary}</p>
                                <div className="flex flex-wrap gap-2">
                                    {lead.ai_analysis.tags?.map(t => (
                                        <Badge key={t} variant="secondary" className="bg-white text-indigo-600 border border-indigo-100 font-normal">#{t}</Badge>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 space-y-3">
                                <p className="text-sm text-slate-500">Get AI-powered summary, verified emails, and lead scoring.</p>
                                <Button size="sm" onClick={() => enrichMutation.mutate()} disabled={enrichMutation.isPending} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200 shadow-none">
                                    {enrichMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Enrich Lead Data
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Notes Section */}
                <Card className="overflow-hidden border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                            <MessageSquare className="h-4 w-4" />
                            Activity & Notes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-4 bg-white space-y-3">
                            <Textarea
                                placeholder="Add a quick note... (e.g. 'Called, busy until 5pm')"
                                className="min-h-[80px] resize-none border-slate-200 focus:ring-indigo-500 focus-visible:ring-indigo-500 bg-slate-50"
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <Button size="sm" onClick={() => addNoteMutation.mutate()} disabled={!noteContent.trim() || addNoteMutation.isPending}>
                                    {addNoteMutation.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Send className="mr-2 h-3 w-3" />}
                                    Save Note
                                </Button>
                            </div>
                        </div>

                        {/* Timeline */}
                        {interactions && interactions.length > 0 && (
                            <div className="border-t border-slate-100 bg-slate-50/30">
                                <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Timeline</div>
                                {interactions.map((interaction: any) => (
                                    <div key={interaction.id} className="px-4 py-3 border-b last:border-0 border-slate-100 flex gap-3">
                                        <span className="text-base shrink-0 mt-0.5">{getInteractionIcon(interaction.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-800 whitespace-pre-wrap">{interaction.content}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                {getTimeAgo(interaction.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Business Details */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                            <Building2 className="h-4 w-4" />
                            Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-4 pt-2">
                        <div className="grid gap-4">
                            {lead.business_details.address && (
                                <div className="flex gap-3">
                                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                                    <div>
                                        <div className="font-medium text-slate-900">{lead.business_details.address}</div>
                                        <a
                                            href={`https://www.google.com/maps/place/?q=place_id:${lead.business_details.google_place_id}`}
                                            target="_blank"
                                            className="text-indigo-600 hover:underline text-xs"
                                        >
                                            View map
                                        </a>
                                    </div>
                                </div>
                            )}

                            {lead.business_details.website && (
                                <div className="flex gap-3">
                                    <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                                    <a href={lead.business_details.website} target="_blank" className="font-medium text-blue-600 hover:underline truncate">
                                        {lead.business_details.website}
                                    </a>
                                </div>
                            )}

                            {lead.contact_details?.email && (
                                <div className="flex gap-3">
                                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span className="text-slate-700">{lead.contact_details.email}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
